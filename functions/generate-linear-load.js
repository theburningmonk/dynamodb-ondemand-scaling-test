const loadTest = require('./lib/load-test')

/* traffic pattern (roughly speaking...)
       
                    ___------------_
              ___---                -_
        ___---                        -_
_____---                                -_________
*/
const tickToCount = (peak, trough, rampUpAt, peakAt, rampDownAt, holdingAt) => (n) => {
  if (n <= rampUpAt) { // holding pattern for the first X ticks
    return trough
  } else if (n <= peakAt) { // then gradually ramp up to peak load
    const dn = (peak - trough) / (peakAt - rampUpAt)
    return trough + (n - rampUpAt) * dn
  } else if (n <= rampDownAt) { // hold steady at the peak
    return peak
  } else if (n <= holdingAt) { // then gradually ramp down to trough
    const dm = (peak - trough) / (holdingAt - rampDownAt)
    const m = n - rampDownAt

    return peak - (dm * m)
  } else {
    return trough
  }
}

const ticks = mins => mins * 60 // every tick is roughly 1sec

module.exports.handler = async (input, context) => {
  const { peak, trough, rampUpAt, peakAt, rampDownAt, holdingAt } = input
  await loadTest(input, context, 
    tickToCount(
      peak, 
      trough, 
      ticks(rampUpAt), 
      ticks(peakAt), 
      ticks(rampDownAt), 
      ticks(holdingAt)))
}