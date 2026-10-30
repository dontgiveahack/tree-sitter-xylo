; Symbol tags (ctags-like navigation).

(function_declaration name: (identifier) @definition.function)
(function_member name: (identifier) @definition.method)
(operator_member) @definition.method

(struct_declaration name: (identifier) @definition.type)
(enum_declaration name: (identifier) @definition.type)
(union_declaration name: (identifier) @definition.type)
(type_alias_declaration name: (identifier) @definition.type)

(enum_member name: (identifier) @definition.constant)
(struct_field name: (identifier) @definition.field)
(variable_declaration name: (identifier) @definition.var)

(call_expression callee: (identifier) @reference.call)
(call_expression callee: (member_expression member: (identifier) @reference.call))
(call_expression callee: (unwrapped_identifier) @reference.call)
(member_expression member: (identifier) @reference.field)
