import {CodeKeywordDefinition} from "../../types"
import KeywordContext from "../../compile/context"
import {allSchemaProperties, schemaRefOrVal, alwaysValidSchema, usePattern} from "../util"
import {applySubschema, SubschemaApplication, Type} from "../../compile/subschema"
import {_, nil, or, Code, Name} from "../../compile/codegen"
import N from "../../compile/names"

const def: CodeKeywordDefinition = {
  keyword: "additionalProperties",
  type: "object",
  schemaType: ["boolean", "object", "undefined"], // "undefined" is needed to support option removeAdditional: "all"
  trackErrors: true,
  code(cxt: KeywordContext) {
    const {gen, schema, parentSchema, data, errsCount, it} = cxt
    if (!errsCount) throw new Error("ajv implementation error")
    const {allErrors, opts} = it
    if (opts.removeAdditional !== "all" && alwaysValidSchema(it, schema)) return
    const props = allSchemaProperties(parentSchema.properties)
    const patProps = allSchemaProperties(parentSchema.patternProperties)
    checkAdditionalProperties()
    if (!allErrors) gen.if(_`${errsCount} === ${N.errors}`)

    function checkAdditionalProperties(): void {
      gen.forIn("key", data, (key: Name) => {
        if (!props.length && !patProps.length) additionalPropertyCode(key)
        else gen.if(isAdditional(key), () => additionalPropertyCode(key))
      })
    }

    function isAdditional(key: Name): Code {
      let definedProp: Code
      if (props.length > 8) {
        // TODO maybe an option instead of hard-coded 8?
        const propsSchema = schemaRefOrVal(it, parentSchema.properties, "properties")
        definedProp = _`${propsSchema}.hasOwnProperty(${key})`
      } else if (props.length) {
        definedProp = or(...props.map((p) => _`${key} === ${p}`))
      } else {
        definedProp = nil
      }
      if (patProps.length) {
        definedProp = or(definedProp, ...patProps.map((p) => _`${usePattern(gen, p)}.test(${key})`))
      }
      return _`!(${definedProp})`
    }

    function deleteAdditional(key: Name): void {
      gen.code(_`delete ${data}[${key}]`)
    }

    function additionalPropertyCode(key: Name): void {
      if (opts.removeAdditional === "all" || (opts.removeAdditional && schema === false)) {
        deleteAdditional(key)
        return
      }

      if (schema === false) {
        cxt.setParams({additionalProperty: key})
        cxt.error()
        if (!allErrors) gen.break()
        return
      }

      if (typeof schema == "object" && !alwaysValidSchema(it, schema)) {
        const valid = gen.name("valid")
        if (opts.removeAdditional === "failing") {
          applyAdditionalSchema(key, valid, false)
          gen.ifNot(valid, () => {
            cxt.reset()
            deleteAdditional(key)
          })
        } else {
          applyAdditionalSchema(key, valid)
          if (!allErrors) gen.ifNot(valid, _`break`)
        }
      }
    }

    function applyAdditionalSchema(key: Name, valid: Name, errors?: false): void {
      const subschema: SubschemaApplication = {
        keyword: "additionalProperties",
        dataProp: key,
        dataPropType: Type.Str,
      }
      if (errors === false) {
        Object.assign(subschema, {
          compositeRule: true,
          createErrors: false,
          allErrors: false,
        })
      }
      applySubschema(it, subschema, valid)
    }
  },
  error: {
    message: "should NOT have additional properties",
    params: ({params}) => _`{additionalProperty: ${params.additionalProperty}}`,
  },
}

module.exports = def

export default def
