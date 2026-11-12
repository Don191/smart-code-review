export interface Rect<T> {
  item: T
  x: number
  y: number
  w: number
  h: number
}

/**
 * Squarified treemap (Bruls, Huizing and van Wijk). Lays the items out in a
 * w by h box with areas in proportion to value, keeping tiles close to square.
 */
export function squarify<T>(items: { item: T; value: number }[], w: number, h: number): Rect<T>[] {
  const total = items.reduce((s, i) => s + i.value, 0)
  if (!total) return []
  const scale = (w * h) / total
  const nodes = [...items].sort((a, b) => b.value - a.value).map(i => ({ item: i.item, area: i.value * scale }))
  const out: Rect<T>[] = []
  let x = 0
  let y = 0
  let cw = w
  let ch = h

  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0)
    const max = Math.max(...row)
    const min = Math.min(...row)
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min))
  }

  let row: typeof nodes = []
  const layout = () => {
    const s = row.reduce((a, b) => a + b.area, 0)
    if (cw >= ch) {
      const rw = s / ch
      let yy = y
      for (const n of row) { const hh = n.area / rw; out.push({ item: n.item, x, y: yy, w: rw, h: hh }); yy += hh }
      x += rw
      cw -= rw
    } else {
      const rh = s / cw
      let xx = x
      for (const n of row) { const ww = n.area / rh; out.push({ item: n.item, x: xx, y, w: ww, h: rh }); xx += ww }
      y += rh
      ch -= rh
    }
    row = []
  }

  for (const n of nodes) {
    const side = Math.min(cw, ch)
    if (!row.length || worst([...row, n].map(r => r.area), side) <= worst(row.map(r => r.area), side)) row.push(n)
    else { layout(); row.push(n) }
  }
  if (row.length) layout()
  return out
}
