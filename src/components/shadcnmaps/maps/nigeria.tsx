'use client'

import { Map, type MapProps } from '../map'
import { nigeriaMapData } from '../map-data/nigeria'

export type RegionId = (typeof nigeriaMapData)['regions'][number]['id']

/* An alias, not an extension — the registry ships this as an empty
   interface, which lint flags as equivalent to its supertype. */
export type NigeriaMapProps = Omit<MapProps, 'data'>

export function NigeriaMap(props: NigeriaMapProps) {
  return <Map data={nigeriaMapData} {...props} />
}
