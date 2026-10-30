; Text objects for nvim-treesitter/nvim-treesitter-textobjects.

(function_declaration) @function.outer
(function_member) @function.outer
(operator_member) @function.outer
(function_literal) @function.outer

(block) @block.outer
(struct_body) @block.outer
(union_body) @block.outer
(enum_body) @block.outer
(initializer_list) @block.outer

(arguments) @parameter.outer
(parameter) @parameter.inner

(comment) @comment.outer
(string_literal) @string.outer
