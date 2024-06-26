import { Schema } from '@effect/schema'
import type { ParseError } from '@effect/schema/ParseResult'
import type { Effect } from 'effect'

const Documented = Schema.Struct({
  // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
  Documentation: Schema.String,
})

const PrimitiveType = Schema.Literal(
  'String',
  'Long',
  'Integer',
  'Double',
  'Boolean',
  'Timestamp',
  'Json',
)

const PrimitiveItemType = Schema.Literal(
  'String',
  'Long',
  'Integer',
  'Double',
  'Boolean',
  'Timestamp',
)

const BaseProperty = Schema.extend(
  Documented,
  Schema.Struct({
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    Required: Schema.Boolean,
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    UpdateType: Schema.Literal('Mutable', 'Immutable', 'Conditional'),
  }),
)

const PrimitiveProperty = Schema.extend(
  BaseProperty,
  Schema.Struct({
    PrimitiveType,
  }),
)

const ListProperty = Schema.extend(
  BaseProperty,
  Schema.Struct({
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    Type: Schema.Literal('List'),
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    ItemType: Schema.String,
  }),
)

const MapProperty = Schema.extend(
  BaseProperty,
  Schema.Struct({
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    Type: Schema.Literal('Map'),
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    ItemType: Schema.String,
  }),
)

const PrimitiveListProperty = Schema.extend(
  BaseProperty,
  Schema.Struct({
    PrimitiveItemType,
  }),
)

const PrimitiveMapProperty = Schema.extend(
  BaseProperty,
  Schema.Struct({
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    PrimitiveItemType: Schema.Literal(
      'String',
      'Long',
      'Integer',
      'Double',
      'Boolean',
      'Timestamp',
    ),
  }),
)

const Property = Schema.Union(
  PrimitiveProperty,
  PrimitiveListProperty,
  PrimitiveMapProperty,
  ListProperty,
  MapProperty,
  // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
  Schema.extend(BaseProperty, Schema.Struct({ Type: Schema.String })),
)

const PrimitiveAttribute = Schema.Struct({
  PrimitiveType,
})

const PrimitiveListAttribute = Schema.Struct({
  // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
  Type: Schema.Literal('List'),
  PrimitiveItemType,
})

const ListAttribute = Schema.Struct({
  // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
  Type: Schema.Literal('List'),
  // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
  ItemType: Schema.String,
})

const Attribute = Schema.Union(
  PrimitiveAttribute,
  PrimitiveListAttribute,
  ListAttribute,
  // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
  Schema.Struct({ Type: Schema.String }),
)

const ResourceType = Schema.extend(
  Documented,
  Schema.Struct({
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    Properties: Schema.Record(Schema.String, Property),
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    Attributes: Schema.optional(Schema.Record(Schema.String, Attribute)),
  }),
)

export class Specification extends Schema.Class<Specification>('Specification')(
  {
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    PropertyTypes: Schema.Record(
      Schema.String,
      Schema.Union(
        Property,
        Schema.extend(
          Documented,
          Schema.Struct({
            // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
            Properties: Schema.Record(Schema.String, Property),
          }),
        ),
      ),
    ),
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    ResourceTypes: Schema.Record(Schema.String, ResourceType),
    // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
    ResourceSpecificationVersion: Schema.String,
  },
) {
  // static empty = new Specification({
  //   // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
  //   PropertyTypes: {},
  //   // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
  //   ResourceTypes: {},
  //   // biome-ignore lint/style/useNamingConvention: AWS uses PascalCase
  //   ResourceSpecificationVersion: '',
  // })

  static decodeUnknown(
    json: unknown,
  ): Effect.Effect<Specification, ParseError> {
    return Schema.decodeUnknown(Specification)(json)
  }

  // static merge(left: Specification, right: Specification): Specification {
  //   const version = Order.max(Order.string)(
  //     left.ResourceSpecificationVersion,
  //     right.ResourceSpecificationVersion,
  //   )
  //
  //   console.log({
  //     left: left.ResourceSpecificationVersion,
  //     right: right.ResourceSpecificationVersion,
  //     version,
  //   })
  //
  //   return Specification.empty
  // }

  getProperties() {
    // return Stream.unfoldChunk(
    //   List.fromIterable(Object.entries(this.ResourceTypes)),
    //   (remaining) =>
    //     Option.match(List.head(remaining), {
    //       onNone: Option.none,
    //       onSome: ([_key, value]) => {
    //         return Option.some([
    //           Chunk.make(value.Properties),
    //           List.tail(remaining),
    //         ] as const)
    //       },
    //     }),
    // )
  }

  // #getNestedProperties(resource: string, property: string, type: string) {
  // const propertyTypes = this.PropertyTypes
  //
  // // biome ignore lint/complexity/noExcessiveCognitiveComplexity: w/e i'm gonna delete this later anyway probably
  // return function*() {
  //   const propertyType = propertyTypes[`${resource}.${type}`]
  // }
  // }
}
