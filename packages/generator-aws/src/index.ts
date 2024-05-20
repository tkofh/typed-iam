import { NodeRuntime } from '@effect/platform-node'
import { Console, Effect } from 'effect'
import { LogUniqueProperties } from './cloudformation'
import { HttpService } from './services/http'

const program = LogUniqueProperties.pipe(
  Effect.tap(Console.log),
  Effect.provide(HttpService.LIVE),
)

NodeRuntime.runMain(program)
