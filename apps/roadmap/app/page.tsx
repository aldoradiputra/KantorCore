import { readFileSync } from 'fs'
import { join } from 'path'
import RoadmapApp from './components/RoadmapApp'

export default function Home() {
  const raw = readFileSync(join(process.cwd(), 'data/features.json'), 'utf-8')
  const data = JSON.parse(raw)
  return <RoadmapApp nodes={data.nodes} version={data.version} />
}
