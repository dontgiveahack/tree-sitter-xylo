; Comments -----------------------------------------------------------------

(comment) @comment

((comment) @comment.documentation
  (#match? @comment.documentation "^///"))

((comment) @comment.documentation
  (#match? @comment.documentation "^//!"))

; Modules and imports -------------------------------------------------------

(module_declaration module: (identifier) @module)

(use_declaration path: (use_path (identifier) @module))
(use_declaration path: (use_path "/" @punctuation.delimiter))

"@mod" @keyword.directive
"@use" @keyword.import
"@include" @keyword.import
"@flag" @keyword.directive

(system_lib_string) @string.special

; Attributes ---------------------------------------------------------------

(attribute) @attribute

"@pub" @keyword.modifier
"@ext" @keyword.modifier
"@build" @keyword.modifier
"@overload" @keyword.modifier
"@test" @keyword.modifier
"@expand" @keyword.modifier
"@expand_block" @keyword.modifier
"@noreturn" @keyword.modifier
"@static" @keyword.modifier
"@cast" @keyword.modifier
"@embed" @keyword.modifier
"@operator" @keyword.modifier

(core_role) @type.builtin

; Keywords -----------------------------------------------------------------

[
  "if" "elif" "else" "match"
  "for" "while" "in"
  "break" "continue" "return" "defer"
  "or"
  "fn"
  "struct" "union" "enum" "type"
  "as"
] @keyword

[
  "true" "false"
] @boolean

; Comptime -----------------------------------------------------------------

[
  "#pre" "#code" "#insert" "#if" "#assert" "#error" "#warn" "#capture"
] @keyword.directive

(comptime_identifier) @keyword.directive

; Types --------------------------------------------------------------------

(primitive_type) @type.builtin

(type_identifier) @type
(qualified_type) @type
"str" @type.builtin

(generic_type name: (identifier) @type)
(generic_type name: (qualified_type) @type)

(struct_declaration name: (identifier) @type)
(enum_declaration name: (identifier) @type)
(union_declaration name: (identifier) @type)
(type_alias_declaration name: (identifier) @type)

(comptime_type) @type

(cast_expression type: (identifier) @type)
(cast_expression type: (qualified_type) @type)
(cast_expression type: (generic_type) @type)
(cast_expression type: (pointer_type) @type)
(cast_expression type: (array_type) @type)
(cast_expression type: (map_type) @type)

; Functions and methods ----------------------------------------------------

(function_declaration name: (identifier) @function)
(function_member name: (identifier) @function.method)
(operator_member) @function.method

(parameter name: (identifier) @variable.parameter)
(comptime_parameter name: (identifier) @variable.parameter)

(call_expression callee: (identifier) @function.call)
(call_expression callee: (unwrapped_identifier) @function.call)
(call_expression callee: (member_expression member: (identifier) @function.method.call))

(named_argument name: (identifier) @variable.parameter)

; Variables and fields -----------------------------------------------------

((identifier) @variable.builtin
  (#eq? @variable.builtin "self"))

(variable_declaration name: (identifier) @variable)
(short_var_declaration name: (identifier) @variable)
(multiple_declaration name: (identifier) @variable)
(tuple_declaration name: (identifier) @variable)
(for_statement binding: (identifier) @variable)
(or_binding name: (identifier) @variable)

(struct_field name: (identifier) @variable.member)
(member_expression member: (identifier) @variable.member)
(keyed_initializer key: (identifier) @variable.member)
(field_pattern name: (identifier) @variable.member)

; Constants ----------------------------------------------------------------

(enum_member name: (identifier) @constant)
(enum_member_expression member: (identifier) @constant)
(variant_pattern name: (identifier) @constant)
(path_pattern name: (identifier) @constant)
(dot_path_expression (identifier) @constant)

; Literals -----------------------------------------------------------------

(number_literal) @number
(string_literal) @string
(concatenated_string) @string
(rune_literal) @character

; Operators ----------------------------------------------------------------

[
  "+" "-" "*" "/" "%"
  "==" "!=" "<" "<=" ">" ">="
  "&&" "||" "!"
  "&" "|" "^" "~" "<<" ">>"
  "="
  "+=" "-=" "*=" "/=" "%="
  "++" "--"
  "..<" "..="
  "..."
  "=>" ":="
  "?"
] @operator

"$" @punctuation.special

; Punctuation --------------------------------------------------------------

[
  "(" ")" "[" "]" "{" "}"
] @punctuation.bracket

[
  "," ";" ":" "."
] @punctuation.delimiter
