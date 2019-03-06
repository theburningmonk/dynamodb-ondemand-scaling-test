const loadTest = require('./lib/load-test')

/* traffic pattern (roughly speaking...)
         ________
        /        --------________
       /                         --------________
      /                                          --------________
_____/                                                           --------________
*/
const tickToCount = (peak, trough, rampUpAt, peakAt, holdingAt) => (n) => {
  if (n <= rampUpAt) { // holding pattern for the first X ticks
    return trough 
  } else if (n <= peakAt) { // then aggressive spike to peak traffic
    const dn = (peak - trough) / (peakAt - rampUpAt)
    return trough + (n - rampUpAt) * dn
  } else if (n <= holdingAt) { // then gradually ramp down to trough
    const dm = (peak - trough) / (holdingAt - peakAt)
    const m = n - peakAt  

    return peak - (dm * m)
  } else {
    return trough
  }
}

const ticks = mins => mins * 60 // every tick is roughly 1sec

module.exports.handler = async (input, context) => {
  const { peak, trough, rampUpAt, peakAt, holdingAt } = input  
  await loadTest(
    input, 
    context, 
    tickToCount(peak, trough, ticks(rampUpAt), ticks(peakAt), ticks(holdingAt)))
}