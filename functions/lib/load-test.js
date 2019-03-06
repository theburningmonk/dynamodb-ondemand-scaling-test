const AWS        = require('./aws')
const lambda     = new AWS.Lambda()
const Promise    = require('bluebird')
const _          = require('lodash')
const dynamodb   = new AWS.DynamoDB.DocumentClient()
const uuidv4     = require('uuid/v4')

const putItems = async (tableName, count) => {
  const batchWrite = async (batch) => {
    try {
      const req = { 
        RequestItems: {
          [tableName]: batch
        }
      }

      //console.log(`saving batch of [${batch.length}]`)

      const resp = await dynamodb.batchWrite(req).promise()
      if (!_.isEmpty(resp.UnprocessedItems)) {
        console.log(`mm... ${resp.UnprocessedItems.length} items failed`)
      }
    } catch (exn) {
      console.log(exn)
    }
  }

  const items = _.range(0, count).map(n => { 
    return {
      PutRequest: {
        Item: { id: uuidv4() }
      }
    }
  })

  let start = Date.now()

  console.log(`saving a total of [${items.length}] items`)

  const chunks = _.chunk(items, 25)
  const tasks = chunks.map(batchWrite)

  await Promise.all(tasks)

  //console.log(`finished saving [${items.length}] items`)

  let end = Date.now()
  let duration = end - start
  if (duration < 1000) {
    let delay = 1000 - duration
    console.log(`waiting a further ${delay}ms`)
    await Promise.delay(delay)
  }
}

const recurse = async (funcName, payload) => {
  console.log("recursing...")
  
  const req = {
    FunctionName: funcName, 
    InvocationType: "Event", 
    Payload: payload
  }
  await lambda.invoke(req).promise()
}

// input should be of shape:
// {
//   tableName: ...,
//   tick: 0,
//   recursionLeft: 0
// }
module.exports = async (input, context, tickToItemCount) => {
  context.callbackWaitsForEmptyEventLoop = false
  console.log(JSON.stringify(input))

  const funcName      = context.functionName
  const tableName     = input.tableName
  const recursionLeft = input.recursionLeft || 0
  var tick = input.tick || 0

  if (recursionLeft <= 0) {
    console.log("All done")
    return
  }

  while (context.getRemainingTimeInMillis() > 2000) {
    try {
      let count = tickToItemCount(tick)
      await putItems(tableName, count)
    } catch (err) {
      console.log(err)
    }

    tick += 1
    console.log(`there are [${context.getRemainingTimeInMillis()}]ms left`)
  }

  const output = _.clone(input)
  output.recursionLeft = recursionLeft - 1
  output.tick = tick

  await recurse(funcName, JSON.stringify(output))
}