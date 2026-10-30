; Tree-sitter indentation for Xylo.
;
; `@indent.begin` opens a level at the node start; `@indent.end` closes it
; at the closing brace token.

(block) @indent.begin
(block "}" @indent.end)

(struct_body) @indent.begin
(struct_body "}" @indent.end)

(union_body) @indent.begin
(union_body "}" @indent.end)

(enum_body) @indent.begin
(enum_body "}" @indent.end)

(initializer_list) @indent.begin
(initializer_list "}" @indent.end)

(anonymous_initializer) @indent.begin
(anonymous_initializer "}" @indent.end)

(comptime_pre) @indent.begin
(comptime_code) @indent.begin
(comptime_if) @indent.begin

([
  "elif"
  "else"
] @indent.branch)
