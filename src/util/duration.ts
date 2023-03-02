/*
  Unit	Shorthand
  days	d
  weeks	w
  months	M
  years	y
  hours	h
  minutes	m
  seconds	s
  milliseconds	ms
*/
export function convertTime(timeString: string) {
  const timeUnits = {
    ms: 1,
    s:  1000,
    m:  60000,
    h:  3600000,
    d:  86400000,
    w:  604800000,
    M:  2592000000,
  }

  if (/^(\d+)\s*(ms|s|m|h|d|w|M)$/.test(timeString)) {
    const unit = RegExp.$2
    const value = parseInt(RegExp.$1, 10)
    return value * timeUnits[unit as 's']
  }

  throw new Error(`Illegal time string ${timeString}`)
}
