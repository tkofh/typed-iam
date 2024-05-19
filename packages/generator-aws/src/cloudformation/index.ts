import { Array, Effect } from 'effect'
import type { HttpService } from '../services/http'
import type { Specification } from './models/Specification'
import {
  GetRegionSpecification,
  type GetRegionSpecificationError,
} from './requests/GetRegionSpecification'
import {
  GetRegionalSpecificationData,
  type GetRegionalSpecificationDataError,
} from './requests/GetRegionalSpecificationData'

export const GetGlobalSpecification: Effect.Effect<
  ReadonlyArray<Specification>,
  GetRegionalSpecificationDataError | GetRegionSpecificationError,
  HttpService
> = GetRegionalSpecificationData.make().pipe(
  Effect.andThen((data) =>
    Effect.all(
      Array.map(data, (item) => GetRegionSpecification.make(item)),
      { concurrency: 'unbounded' },
    ),
  ),
)
