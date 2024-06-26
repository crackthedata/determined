// eventuallyRequred allows for two-step validation.  This is a requirement specific to Determined
// because there are fields required (checkpoint_storage) but which may not be present in what the
// user actually submits, since a cluster default may be present.
//
// eventuallyRequired behaves identically to required, only when building the validator, it is
// possible to not include the eventuallyRequired extension; making it possible to *not* enforce
// eventuallyRequired at specific times.

// See ./checks.go for notes on implementing extensions for the santhosh-tekuri/jsonschema package.

package extensions

import (
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v2"
)

func eventuallyRequiredCompile(ctx jsonschema.CompilerContext, m JSONObject) (interface{}, error) {
	eventuallyRequired, ok := m["eventuallyRequired"]
	if !ok {
		return nil, nil
	}

	// eventuallyRequired is a list of string property names.
	var required []string
	for _, prop := range eventuallyRequired.(JSONArray) {
		required = append(required, prop.(string))
	}
	return required, nil
}

func eventuallyRequiredValidate(
	ctx jsonschema.ValidationContext, rawRequired interface{}, instance JSON,
) error {
	object, ok := instance.(JSONObject)
	if !ok {
		return nil
	}

	required := rawRequired.([]string)

	var errors []error

	// Require every eventuallyRequired property to be present in object.
	for _, prop := range required {
		value, ok := object[prop]
		if ok && value != nil {
			continue
		}
		reason := fmt.Sprintf("%v is a required property", prop)
		errors = append(errors, ctx.Error("eventuallyRequired", reason))
	}

	if len(errors) == 0 {
		return nil
	}

	var x jsonschema.ValidationError
	return x.Group(ctx.Error("eventuallyRequired", "missing required properties"), errors...)
}

// EventuallyRequiredExtension instantiates the eventuallyRequired extension.
func EventuallyRequiredExtension() jsonschema.Extension {
	meta, err := jsonschema.CompileString("eventuallyRequired.json", `{
		"properties" : {
			"eventuallyRequired": {
				"items": { "type": "string" }
			}
		}
	}`)
	if err != nil {
		panic(err)
	}
	return jsonschema.Extension{
		Meta:     meta,
		Compile:  eventuallyRequiredCompile,
		Validate: eventuallyRequiredValidate,
	}
}
