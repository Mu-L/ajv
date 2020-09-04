"use strict"

var Ajv = require("../ajv")
var should = require("../chai").should()

describe("meta and validateSchema options", () => {
  it("should add draft-7 meta schema by default", () => {
    testOptionMeta(new Ajv())
    testOptionMeta(new Ajv({meta: true}))

    function testOptionMeta(ajv) {
      ajv.getSchema("http://json-schema.org/draft-07/schema").should.be.a("function")
      ajv.validateSchema({type: "integer"}).should.equal(true)
      ajv.validateSchema({type: 123}).should.equal(false)
      should.not.throw(() => {
        ajv.addSchema({type: "integer"})
      })
      should.throw(() => {
        ajv.addSchema({type: 123})
      })
    }
  })

  it("should throw if meta: false and validateSchema: true", () => {
    var ajv = new Ajv({meta: false, logger: false})
    should.not.exist(ajv.getSchema("http://json-schema.org/draft-07/schema"))
    should.not.throw(() => {
      ajv.addSchema({type: "wrong_type"}, "integer")
    })
  })

  it("should skip schema validation with validateSchema: false", () => {
    var ajv = new Ajv()
    should.throw(() => {
      ajv.addSchema({type: 123}, "integer")
    })

    ajv = new Ajv({validateSchema: false})
    should.not.throw(() => {
      ajv.addSchema({type: 123}, "integer")
    })

    ajv = new Ajv({validateSchema: false, meta: false})
    should.not.throw(() => {
      ajv.addSchema({type: 123}, "integer")
    })
  })

  describe('validateSchema: "log"', () => {
    let loggedError, loggedWarning
    const logger = {
      log() {},
      warn: () => (loggedWarning = true),
      error: () => (loggedError = true),
    }

    beforeEach(() => {
      loggedError = false
      loggedWarning = false
    })

    it("should not throw on invalid schema", () => {
      const ajv = new Ajv({validateSchema: "log", logger})
      should.not.throw(() => {
        ajv.addSchema({type: 123}, "integer")
      })
      loggedError.should.equal(true)
      loggedWarning.should.equal(false)
    })

    it("should not throw on invalid schema with meta: false", () => {
      const ajv = new Ajv({validateSchema: "log", meta: false, logger})
      should.not.throw(() => {
        ajv.addSchema({type: 123}, "integer")
      })
      loggedError.should.equal(false)
      loggedWarning.should.equal(true)
    })
  })

  it("should validate v6 schema", () => {
    var ajv = new Ajv()
    ajv.validateSchema({contains: {minimum: 2}}).should.equal(true)
    ajv.validateSchema({contains: 2}).should.equal(false)
  })

  it("should use option meta as default meta schema", () => {
    var meta = {
      $schema: "http://json-schema.org/draft-07/schema",
      properties: {
        myKeyword: {type: "boolean"},
      },
    }
    var ajv = new Ajv({meta: meta})
    ajv.validateSchema({myKeyword: true}).should.equal(true)
    ajv.validateSchema({myKeyword: 2}).should.equal(false)
    ajv
      .validateSchema({
        $schema: "http://json-schema.org/draft-07/schema",
        myKeyword: 2,
      })
      .should.equal(true)

    ajv = new Ajv()
    ajv.validateSchema({myKeyword: true}).should.equal(true)
    ajv.validateSchema({myKeyword: 2}).should.equal(true)
  })
})
