; Local variable tracking for scope-aware highlighting.

(function_declaration) @local.scope
(block) @local.scope
(for_statement) @local.scope
(if_statement) @local.scope
(while_statement) @local.scope
(match_arm) @local.scope
(or_block) @local.scope

(parameter name: (identifier) @local.definition)
(comptime_parameter name: (identifier) @local.definition)
(variable_declaration name: (identifier) @local.definition)
(short_var_declaration name: (identifier) @local.definition)
(multiple_declaration name: (identifier) @local.definition)
(tuple_declaration name: (identifier) @local.definition)
(for_statement binding: (identifier) @local.definition)
(or_binding name: (identifier) @local.definition)
(field_pattern name: (identifier) @local.definition)

(identifier) @local.reference
