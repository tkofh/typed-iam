import { NodeRuntime } from '@effect/platform-node'
import { Console, Effect } from 'effect'
import { GetGlobalSpecification } from './cloudformation'
import { HttpService } from './services/http'

const program = GetGlobalSpecification.pipe(
  Effect.tap(Console.log),
  Effect.provide(HttpService.LIVE),
)

NodeRuntime.runMain(program)
