/**
 * Tree-sitter grammar for the Xylo programming language.
 *
 * Xylo is a small systems language: `//` comments, `name: @mod;` module
 * headers, `$` for mutable bindings, `#` for comptime, `@` for attributes,
 * `T?` / `T!` type wrappers and postfix operators.
 *
 * The grammar is intentionally permissive in a few places (it is an editor
 * grammar, not the reference parser): it never rejects a program that xyloc
 * accepts, and it keeps the tree shaped for highlighting, folding, text
 * objects and indentation.
 */

const PREC = {
  or: 2,
  logical_or: 3,
  logical_and: 4,
  bit_or: 5,
  bit_xor: 6,
  bit_and: 7,
  equality: 8,
  comparison: 9,
  shift: 10,
  additive: 11,
  multiplicative: 12,
  cast: 13,
  unary: 14,
  postfix: 15,
  call: 16,
};

const commaSep = (rule) => seq(rule, repeat(seq(',', rule)), optional(','));
const commaSep1 = (rule) => seq(rule, repeat(seq(',', rule)), optional(','));
const commaList = (rule) => prec.left(seq(rule, repeat(seq(',', rule))));

// Type declarations may or may not be followed by a semicolon; the
// higher-precedence alternative consumes it when present.
const terminated = (rule) => choice(
  prec(1, seq(rule, ';')),
  rule,
);

module.exports = grammar({
  name: 'xylo',

  word: $ => $.lower_identifier,

  extras: $ => [
    /\s/,
    $.comment,
  ],

  conflicts: $ => [
    [$.argument, $.parenthesized_expression],
    [$.concatenated_string, $._expression],
    [$.comptime_statement, $.comptime_expression],
    [$.struct_initializer, $.identifier],
    [$.array_type, $.array_initializer],
    [$.function_literal, $._expression],
    [$.struct_pattern, $.identifier],
    [$.type_alias_declaration, $.primitive_type],
    [$.qualified_type, $._expression],
    [$.qualified_type, $._type],
    [$.generic_type, $._expression],
    [$.generic_type, $._type]
  ],

  rules: {
    source_file: $ => repeat($._item),

    // ---------------------------------------------------------------------
    // Comments
    // ---------------------------------------------------------------------

    comment: $ => token(seq('//', /[^\n\r]*/)),

    // ---------------------------------------------------------------------
    // Top level items
    // ---------------------------------------------------------------------

    _item: $ => choice(
      $.module_declaration,
      $.use_declaration,
      $.include_declaration,
      $.flag_declaration,
      $._statement,
    ),

    module_declaration: $ => prec(10, seq(
      field('module', $.identifier),
      ':',
      '@mod',
      ';',
    )),

    use_declaration: $ => seq(
      repeat($.attribute),
      optional(seq(field('alias', $.identifier), ':')),
      '@use',
      field('path', $.use_path),
      ';',
    ),

    use_path: $ => seq(
      $.identifier,
      repeat(seq('/', $.identifier)),
      optional(choice(
        seq('.', field('symbol', $.identifier)),
        seq('.', $.use_group),
        '.*',
      )),
    ),

    use_group: $ => seq('{', commaSep1($.identifier), '}'),

    include_declaration: $ => seq(
      '@include',
      choice($.system_lib_string, $.string_literal),
      ';',
    ),

    // Tokenized as one lexeme: `<stdio.h>` is not an expression.
    system_lib_string: _ => token(seq('<', /[^>\n\r]*/, '>')),

    flag_declaration: $ => seq(
      '@flag',
      $.string_literal,
      ';',
    ),

    // ---------------------------------------------------------------------
    // Attributes
    // ---------------------------------------------------------------------

    attribute: $ => choice(
      '@pub',
      '@ext',
      '@build',
      '@overload',
      '@test',
      '@expand',
      '@expand_block',
      '@noreturn',
      '@static',
      '@cast',
      seq('@core', '(', $.core_role, ')'),
    ),

    core_role: _ => choice('string', 'error'),

    operator_symbol: _ => choice(
      '[]',
      '*[]',
      '[]=',
      '[]=',
      '+',
      '-',
      '*',
      '/',
      '%',
      '==',
      '!=',
      '<',
      '<=',
      '>',
      '>=',
      '+=',
      '-=',
      '*=',
      '/=',
      '%=',
      '&',
      '|',
      '^',
      '<<',
      '>>',
      '&&',
      '||',
      '!',
      '~',
      '++',
      '--',
    ),

    // ---------------------------------------------------------------------
    // Declarations
    // ---------------------------------------------------------------------

    function_declaration: $ => prec(2, seq(
      repeat($.attribute),
      optional('$'),
      field('name', $.identifier),
      ':',
      field('type', $.function_type),
      choice(
        seq('=', field('body', $.function_body)),
        ';',
      ),
    )),

    struct_declaration: $ => terminated(seq(
      repeat($.attribute),
      field('name', $.identifier),
      ':',
      'struct',
      optional($.generic_parameters),
      '=',
      field('body', $.struct_body),
    )),

    enum_declaration: $ => terminated(seq(
      repeat($.attribute),
      field('name', $.identifier),
      ':',
      'enum',
      optional(field('backing', $._type)),
      '=',
      field('body', $.enum_body),
      optional(seq('as', field('backing', $._type))),
    )),

    union_declaration: $ => terminated(seq(
      repeat($.attribute),
      field('name', $.identifier),
      ':',
      'union',
      optional($.generic_parameters),
      '=',
      field('body', $.union_body),
    )),

    type_alias_declaration: $ => seq(
      repeat($.attribute),
      field('name', $.identifier),
      ':',
      'type',
      '=',
      field('value', $._type),
      ';',
    ),

    variable_declaration: $ => seq(
      repeat($.attribute),
      optional('$'),
      field('name', $.identifier),
      ':',
      field('type', $._var_type),
      choice(
        ';',
        seq('=', field('value', choice(
          seq(choice($._expression, $.anonymous_initializer), ';'),
          $.or_block_expression,
        ))),
      ),
    ),

    none_declaration: $ => seq(
      'none',
      ':',
      field('type', $._var_type),
      choice(
        ';',
        seq('=', field('value', choice($._expression, $.anonymous_initializer)), ';'),
      ),
    ),

    multiple_declaration: $ => seq(
      repeat($.attribute),
      optional('$'),
      field('name', $.identifier),
      repeat1(seq(',', optional('$'), field('name', $.identifier))),
      ':',
      field('type', $._var_type),
      choice(
        ';',
        seq('=', field('value', choice(
          seq(commaList(choice($._expression, $.anonymous_initializer)), ';'),
          $.or_block_expression,
        ))),
      ),
    ),

    short_var_declaration: $ => prec(3, seq(
      optional('$'),
      field('name', $.identifier),
      ':=',
      field('value', choice(
        seq(choice($._expression, $.anonymous_initializer), ';'),
        $.or_block_expression,
      )),
    )),

    tuple_declaration: $ => prec(3, seq(
      optional('$'),
      field('name', $.identifier),
      repeat1(seq(',', optional('$'), field('name', $.identifier))),
      ':=',
      field('value', choice(
        seq(commaList(choice($._expression, $.anonymous_initializer)), ';'),
        $.or_block_expression,
      )),
    )),

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    _type: $ => choice(
      $.pointer_type,
      $.const_type,
      $.optional_type,
      $.error_type,
      $.array_type,
      $.map_type,
      $.tuple_type,
      $.function_type,
      $.generic_type,
      $.qualified_type,
      $.comptime_type,
      $.primitive_type,
      $.identifier,
    ),

    // Variable declarations cannot have a bare `fn(...)` type: that spelling
    // is a function declaration. Fn-typed variables are `fn(...) = ref;`,
    // which parses as a function declaration too.
    _var_type: $ => choice(
      $.pointer_type,
      $.const_type,
      $.optional_type,
      $.error_type,
      $.array_type,
      $.map_type,
      $.tuple_type,
      $.generic_type,
      $.qualified_type,
      $.comptime_type,
      $.primitive_type,
      $.identifier,
    ),

    comptime_type: $ => seq('#', field('name', $.identifier)),

    pointer_type: $ => prec(PREC.unary, seq(
      '*',
      optional('const'),
      field('element', $._type),
    )),

    const_type: $ => seq('const', field('element', $._type)),

    optional_type: $ => prec(PREC.postfix, seq(
      field('element', $._type),
      '?',
    )),

    error_type: $ => prec(PREC.postfix, seq(
      field('element', $._type),
      '!',
    )),

    array_type: $ => seq(
      '[',
      choice(
        '?',
        seq('..', field('capacity', $._expression)),
        optional(field('length', $._expression)),
      ),
      ']',
      field('element', $._type),
    ),

    map_type: $ => seq(
      'map',
      '[',
      field('key', $._type),
      ',',
      field('value', $._type),
      ']',
    ),

    tuple_type: $ => seq(
      '(',
      field('element', $._type),
      choice(
        ')',
        seq(',', optional(commaSep1($._type)), ')'),
      ),
    ),

    function_type: $ => prec.right(seq(
      'fn',
      '(',
      optional(commaSep1($.parameter)),
      ')',
      optional(field('return', choice($._type, '!'))),
    )),

    generic_type: $ => seq(
      field('name', choice($.identifier, $.qualified_type)),
      '(',
      commaSep1($.generic_argument),
      ')',
    ),

    generic_argument: $ => choice(
      $._type,
      $.number_literal,
      $.string_literal,
      $.rune_literal,
      $.boolean_literal,
      $.null_literal,
    ),

    qualified_type: $ => prec.left(seq(
      field('module', $.identifier),
      repeat1(seq('.', field('name', $.identifier))),
    )),

    primitive_type: _ => choice(
      'i8', 'i16', 'i32', 'i64', 'isize',
      'u8', 'u16', 'u32', 'u64', 'usize',
      'f32', 'f64', 'f80',
      'char', 'bool', 'void', 'none', 'type',
    ),

    generic_parameters: $ => seq(
      '(',
      commaSep1($.comptime_parameter),
      ')',
    ),

    comptime_parameter: $ => seq(
      '#',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional(seq('=', field('default', $._expression))),
    ),

    parameter: $ => choice(
      seq(
        repeat($.attribute),
        optional('$'),
        optional(seq(field('name', $.identifier), ':')),
        field('type', choice(
          seq('...', $._type),
          $._type,
        )),
        optional(seq('=', field('default', $._expression))),
      ),
      // `#T: type` comptime parameter
      $.comptime_parameter,
      // C variadic marker
      '...',
    ),

    // ---------------------------------------------------------------------
    // Struct / union / enum bodies
    // ---------------------------------------------------------------------

    struct_body: $ => seq(
      '{',
      repeat(choice($._struct_member, ',', ';')),
      '}',
    ),

    _struct_member: $ => choice(
      $.struct_field,
      $.operator_member,
      $.function_member,
      $.embed_field,
      $.struct_declaration,
      $.enum_declaration,
      $.union_declaration,
      $.type_alias_declaration,
    ),

    struct_field: $ => prec(1, seq(
      repeat($.attribute),
      optional('$'),
      field('name', $.identifier),
      repeat(seq(',', optional('$'), field('name', $.identifier))),
      ':',
      field('type', $._type),
      optional(seq('=', field('default', $._expression))),
    )),

    operator_member: $ => prec(3, seq(
      repeat($.attribute),
      '@operator',
      field('operator', $.operator_symbol),
      ':',
      field('type', $.function_type),
      choice(
        seq('=', field('body', $.function_body)),
        ';',
      ),
    )),

    function_member: $ => prec(2, seq(
      repeat($.attribute),
      optional('$'),
      field('name', $.identifier),
      ':',
      field('type', $.function_type),
      choice(
        seq('=', field('body', $.function_body)),
        ';',
      ),
    )),

    embed_field: $ => seq(
      '@embed',
      field('type', $._type),
      ';',
    ),

    union_body: $ => seq(
      '{',
      repeat(choice(
        $.union_variant,
        $.operator_member,
        $.struct_declaration,
        $.enum_declaration,
        $.union_declaration,
        $.type_alias_declaration,
        ',',
        ';',
      )),
      '}',
    ),

    union_variant: $ => choice(
      // `name: none;` / `name: struct = { ... }`
      seq(
        repeat($.attribute),
        optional('$'),
        field('name', choice($.identifier, 'none')),
        ':',
        field('type', $._type),
        optional(seq('=', field('body', $.anonymous_initializer))),
      ),
      // anonymous type variants: `U: union = { E1, E2 }`
      seq(
        repeat($.attribute),
        field('type', $._type),
      ),
    ),

    enum_body: $ => seq(
      '{',
      repeat(choice(
        $.enum_member,
        $.operator_member,
        $.function_member,
        $.struct_declaration,
        $.enum_declaration,
        $.union_declaration,
        $.type_alias_declaration,
        ',',
        ';',
      )),
      '}',
    ),

    enum_member: $ => seq(
      repeat($.attribute),
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression))),
    ),

    // ---------------------------------------------------------------------
    // Function bodies
    // ---------------------------------------------------------------------

    function_body: $ => choice(
      $.block,
      $._single_statement,
    ),

    block: $ => seq(
      '{',
      repeat($._statement),
      '}',
    ),

    // ---------------------------------------------------------------------
    // Statements
    // ---------------------------------------------------------------------

    _statement: $ => choice(
      $.block,
      $._single_statement,
    ),

    _single_statement: $ => choice(
      $.if_statement,
      $.while_statement,
      $.for_statement,
      $.match_expression,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.defer_statement,
      $.comptime_statement,
      $.or_statement,
      $.multiple_assignment_statement,
      $.assignment_statement,
      $.increment_statement,
      $.tuple_declaration,
      $.short_var_declaration,
      $.operator_member,
      $.function_declaration,
      $.struct_declaration,
      $.enum_declaration,
      $.union_declaration,
      $.type_alias_declaration,
      $.variable_declaration,
      $.none_declaration,
      $.multiple_declaration,
      $._expression_statement,
    ),

    _expression_statement: $ => seq($._expression, ';'),

    or_statement: $ => $.or_block_expression,

    if_statement: $ => prec.right(seq(
      'if',
      optional($.if_initializer),
      field('condition', $._expression),
      field('body', $.body),
      repeat($.elif_clause),
      optional($.else_clause),
    )),

    if_initializer: $ => choice(
      seq(optional('$'), field('name', $.identifier), ':=',
          field('value', $._expression), ';'),
      seq(optional('$'), field('name', $.identifier), ':', field('type', $._var_type),
          optional(seq('=', field('value', $._expression))), ';'),
      seq(commaSep1($._expression), choice('=', '+=', '-=', '*=', '/=', '%='),
          commaSep1($._expression), ';'),
    ),

    elif_clause: $ => seq(
      'elif',
      optional($.if_initializer),
      field('condition', $._expression),
      field('body', $.body),
    ),

    else_clause: $ => seq(
      'else',
      field('body', $.body),
    ),

    body: $ => prec(20, seq(optional('=>'), $._statement)),

    while_statement: $ => seq(
      'while',
      field('condition', $._expression),
      field('body', $.body),
    ),

    for_statement: $ => seq(
      'for',
      choice(
        seq(
          '(',
          optional($._for_clause),
          ';',
          optional(field('condition', $._expression)),
          ';',
          optional($._for_clause),
          ')',
          field('body', $.body),
        ),
        seq(
          commaSep1(seq(optional('$'), field('binding', $.identifier))),
          'in',
          field('iterable', $._expression),
          field('body', $.body),
        ),
      ),
    ),

    _for_clause: $ => choice(
      seq(optional('$'), field('name', $.identifier), ':=', field('value', $._expression)),
      seq(optional('$'), field('name', $.identifier), ':', field('type', $._type),
          optional(seq('=', field('value', $._expression)))),
      seq(commaSep1($._expression), choice('=', '+=', '-=', '*=', '/=', '%='), $._expression),
      seq($._expression, choice('++', '--')),
      $._expression,
    ),

    return_statement: $ => choice(
      prec.right(seq(
        'return',
        optional(commaList(choice($._expression, $.anonymous_initializer))),
        optional(';'),
      )),
      seq('return', $.or_block_expression),
    ),

    break_statement: _ => seq('break', ';'),

    continue_statement: _ => seq('continue', ';'),

    defer_statement: $ => seq(
      'defer',
      field('body', $._statement),
    ),

    multiple_assignment_statement: $ => prec(4, seq(
      optional('$'),
      field('name', $.identifier),
      repeat1(seq(',', optional('$'), field('name', $.identifier))),
      field('operator', choice('=', '+=', '-=', '*=', '/=', '%=')),
      field('value', choice(
        seq(commaList(choice($._expression, $.anonymous_initializer)), ';'),
        $.or_block_expression,
      )),
    )),

    assignment_statement: $ => prec(2, seq(
      commaSep1($._expression),
      field('operator', choice('=', '+=', '-=', '*=', '/=', '%=')),
      field('value', choice(
        seq(commaList(choice($._expression, $.anonymous_initializer)), ';'),
        $.or_block_expression,
      )),
    )),

    increment_statement: $ => prec(1, seq(
      $._expression,
      choice('++', '--'),
      ';',
    )),

    // ---------------------------------------------------------------------
    // Comptime
    // ---------------------------------------------------------------------

    comptime_statement: $ => choice(
      $.comptime_pre,
      $.comptime_code,
      $.comptime_if,
    ),

    comptime_expression: $ => choice(
      $.comptime_pre,
      $.comptime_code,
      $.comptime_insert,
      $.comptime_if,
      $.comptime_assert,
      $.comptime_diag,
      $.comptime_capture,
      $.comptime_identifier,
    ),

    comptime_pre: $ => prec(PREC.unary, seq(
      '#pre',
      choice($.block, $._expression),
    )),

    comptime_code: $ => prec(PREC.unary, seq(
      '#code',
      choice($.block, $._expression),
    )),

    comptime_insert: $ => prec(PREC.unary, seq(
      '#insert',
      $._expression,
    )),

    comptime_if: $ => prec.right(seq(
      '#if',
      field('condition', $._match_value),
      choice(
        seq('then', field('then', $._expression),
            optional(seq('else', field('else', $._expression)))),
        seq(field('body', $.block),
            optional(seq('else', field('else', $.block)))),
      ),
    )),

    comptime_assert: $ => seq(
      '#assert',
      $.arguments,
    ),

    comptime_diag: $ => seq(
      choice('#error', '#warn'),
      $.arguments,
    ),

    comptime_capture: $ => seq(
      '#capture',
      $.arguments,
    ),

    comptime_identifier: $ => seq('#', $.identifier),

    // ---------------------------------------------------------------------
    // Expressions
    // ---------------------------------------------------------------------

    _expression: $ => choice(
      $.identifier,
      $.comptime_expression,
      $.number_literal,
      $.string_literal,
      $.concatenated_string,
      $.rune_literal,
      $.boolean_literal,
      $.null_literal,
      $.primitive_type,
      $.parenthesized_expression,
      $.array_initializer,
      $.struct_initializer,
      $.member_expression,
      $.index_expression,
      $.slice_expression,
      $.range_expression,
      $.call_expression,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      $.cast_expression,
      $.unwrap_expression,
      $.propagate_expression,
      $.postfix_update_expression,
      $.or_expression,
      $.function_literal,
      $.function_type,
      $.mutable_expression,
      $.array_type,
      $.unwrapped_identifier,
    ),

    // `x?` is lexed as one token so a spaced `x ? a : b` is always a
    // ternary instead of an unwrap followed by junk. Bare unwraps are the
    // only place the two spellings collide; calls/indexes keep the grammar
    // form below.
    unwrapped_identifier: $ => prec(1, choice(
      $.lower_unwrap,
      $.type_unwrap,
      $.upper_unwrap,
      $.single_upper_unwrap,
    )),

    lower_unwrap: _ => /[a-z_][A-Za-z0-9_]*\?/,

    type_unwrap: _ => /[A-Z][A-Za-z0-9_]+\?/,

    upper_unwrap: _ => token(prec(1, /[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\?/)),

    single_upper_unwrap: _ => /[A-Z]\?/,

    mutable_expression: $ => prec(PREC.unary, seq('$', $._expression)),

    function_literal: $ => seq(
      $.function_type,
      '=',
      $.function_body,
    ),

    parenthesized_expression: $ => seq(
      '(',
      $._expression,
      ')',
    ),

    member_expression: $ => prec(PREC.postfix, seq(
      field('object', $._expression),
      '.',
      field('member', $.identifier),
    )),

    enum_member_expression: $ => prec(PREC.postfix, seq(
      '.',
      field('member', $.identifier),
    )),

    dot_path_expression: $ => prec(PREC.postfix, seq(
      '.',
      field('member', $.identifier),
      repeat1(seq('.', field('member', $.identifier))),
    )),

    index_expression: $ => prec(PREC.postfix, seq(
      field('object', $._expression),
      '[',
      field('index', $._expression),
      ']',
    )),

    slice_expression: $ => prec(PREC.postfix, seq(
      field('object', $._expression),
      '[',
      optional(field('start', $._expression)),
      ':',
      optional(field('end', $._expression)),
      ']',
    )),

    range_expression: $ => prec.left(PREC.comparison, seq(
      field('start', $._expression),
      choice('..<', '..='),
      field('end', $._expression),
    )),

    call_expression: $ => prec(PREC.call, seq(
      field('callee', $._expression),
      field('arguments', $.arguments),
    )),

    arguments: $ => seq(
      '(',
      optional(commaSep1($.argument)),
      ')',
    ),

    argument: $ => choice(
      $.named_argument,
      $._expression,
      $.anonymous_initializer,
    ),

    named_argument: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._expression),
    ),

    unary_expression: $ => prec(PREC.unary, seq(
      field('operator', choice('!', '~', '-', '*', '&', '++', '--')),
      field('operand', $._expression),
    )),

    binary_expression: $ => {
      const table = [
        ['||', PREC.logical_or],
        ['&&', PREC.logical_and],
        ['|', PREC.bit_or],
        ['^', PREC.bit_xor],
        ['&', PREC.bit_and],
        ['==', PREC.equality],
        ['!=', PREC.equality],
        ['<', PREC.comparison],
        ['<=', PREC.comparison],
        ['>', PREC.comparison],
        ['>=', PREC.comparison],
        ['<<', PREC.shift],
        ['>>', PREC.shift],
        ['+', PREC.additive],
        ['-', PREC.additive],
        ['*', PREC.multiplicative],
        ['/', PREC.multiplicative],
        ['%', PREC.multiplicative],
      ];

      return choice(...table.map(([operator, precedence]) =>
        prec.left(precedence, seq(
          field('left', $._expression),
          field('operator', operator),
          field('right', $._expression),
        ))
      ));
    },

    ternary_expression: $ => prec.right(20, seq(
      field('condition', $._expression),
      '?',
      field('consequence', $._expression),
      ':',
      field('alternative', $._expression),
    )),

    postfix_update_expression: $ => prec(PREC.postfix, seq(
      field('value', $._expression),
      field('operator', choice('++', '--')),
    )),

    cast_expression: $ => prec.left(PREC.cast, seq(
      field('value', $._expression),
      'as',
      field('type', $._type),
    )),

    unwrap_expression: $ => prec.dynamic(0, prec(PREC.postfix, seq(
      field('value', $._postfix_value),
      '?',
    ))),

    propagate_expression: $ => prec.dynamic(0, prec(PREC.postfix, seq(
      field('value', $._postfix_value),
      '!',
    ))),

    _postfix_value: $ => prec(1, choice(
      $.call_expression,
    )),

    or_expression: $ => prec.left(PREC.or, seq(
      field('value', $._expression),
      'or',
      field('handler', $._expression),
    )),

    or_block_expression: $ => prec.left(PREC.or, seq(
      field('value', $._expression),
      'or',
      field('handler', choice(
        $.or_block,
        $.or_binding,
        seq('return', optional(';')),
        seq($.or_defer, optional(';')),
      )),
    )),

    or_block: $ => $.block,

    or_binding: $ => seq(
      '(',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      ')',
      $.block,
    ),

    or_defer: $ => seq(
      'defer',
      $._expression,
    ),

    // ---------------------------------------------------------------------
    // Initializers
    // ---------------------------------------------------------------------

    array_initializer: $ => seq(
      '[',
      optional(commaSep1($._expression)),
      ']',
    ),

    struct_initializer: $ => choice(
      prec(PREC.call, seq(
        field('type', choice(
          $.qualified_type,
          $.generic_type,
          $.map_type,
          $.type_identifier,
          'str',
        )),
        field('body', $.initializer_list),
      )),
      seq(
        field('type', $._single_upper),
        field('body', $.initializer_list),
      ),
    ),

    anonymous_initializer: $ => seq(
      '{',
      optional(commaSep1($._initializer_entry)),
      '}',
    ),

    initializer_list: $ => seq(
      '{',
      optional(commaSep1($._initializer_entry)),
      '}',
    ),

    _initializer_entry: $ => choice(
      $.keyed_initializer,
      $._expression,
      $.enum_member_expression,
      $.dot_path_expression,
      $.anonymous_initializer,
    ),

    keyed_initializer: $ => seq(
      field('key', $._expression),
      '=',
      field('value', choice($._expression, $.enum_member_expression, $.dot_path_expression, $.anonymous_initializer)),
    ),

    // ---------------------------------------------------------------------
    // Match
    // ---------------------------------------------------------------------

    _match_value: $ => choice(
      $.identifier,
      $.unwrapped_identifier,
      $.number_literal,
      $.string_literal,
      $.rune_literal,
      $.boolean_literal,
      $.null_literal,
      $.primitive_type,
      $.enum_member_expression,
      $.parenthesized_expression,
      $.call_expression,
      $.member_expression,
      $.index_expression,
      $.slice_expression,
      $.cast_expression,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      $.range_expression,
      $.comptime_expression,
    ),

    match_expression: $ => prec.right(seq(
      'match',
      field('value', $._match_value),
      '{',
      repeat($.match_arm),
      '}',
      optional($.else_clause),
    )),

    match_arm: $ => seq(
      field('pattern', $._pattern),
      field('body', seq(optional('=>'), $._statement)),
    ),

    _pattern: $ => choice(
      $.alternative_pattern,
      $._simple_pattern,
    ),

    _simple_pattern: $ => choice(
      $.identifier,
      $.path_pattern,
      $.variant_pattern,
      $.number_literal,
      $.string_literal,
      $.rune_literal,
      $.boolean_literal,
      $.null_literal,
      $.range_pattern,
      $.struct_pattern,
      $.sequence_pattern,
      $.parenthesized_pattern,
    ),

    path_pattern: $ => prec(1, seq(
      field('module', $.identifier),
      repeat1(seq('.', field('name', $.identifier))),
    )),

    variant_pattern: $ => prec.right(1, seq(
      '.',
      field('name', choice($.identifier, 'none')),
      optional(seq('(', commaSep($._pattern), ')')),
    )),

    range_pattern: $ => prec.left(seq(
      choice($.number_literal, $.rune_literal, $.identifier),
      choice('..<', '..='),
      choice($.number_literal, $.rune_literal, $.identifier),
    )),

    parenthesized_pattern: $ => seq('(', $._pattern, ')'),

    struct_pattern: $ => seq(
      field('type', choice($.qualified_type, $.type_identifier)),
      '{',
      optional(commaSep1($.field_pattern)),
      '}',
    ),

    field_pattern: $ => seq(
      field('name', $.identifier),
      optional(seq('=', field('pattern', $._pattern))),
    ),

    sequence_pattern: $ => seq(
      '[',
      optional(choice(
        commaSep($._pattern),
        seq(commaSep($._pattern), '...', field('rest', $.identifier)),
        seq('...', field('rest', $.identifier)),
      )),
      ']',
    ),

    alternative_pattern: $ => prec.left(seq(
      $._simple_pattern,
      repeat1(seq('|', $._simple_pattern)),
    )),

    // ---------------------------------------------------------------------
    // Literals
    // ---------------------------------------------------------------------

    number_literal: _ => token(choice(
      /0[xX][0-9a-fA-F_]+/,
      /0[bB][01_]+/,
      /[0-9][0-9_]*(\.[0-9][0-9_]*)?([eE][+-]?[0-9][0-9_]*)?/,
    )),

    string_literal: _ => token(seq(
      '"',
      repeat(choice(
        /[^"\\\n\r]/,
        /\\./,
      )),
      '"',
    )),

    concatenated_string: $ => prec.right(seq(
      $.string_literal,
      repeat1($.string_literal),
    )),

    rune_literal: _ => token(seq(
      "'",
      repeat1(choice(
        /[^'\\\n\r]/,
        /\\./,
      )),
      "'",
    )),

    boolean_literal: _ => choice('true', 'false'),

    null_literal: _ => 'null',

    identifier: $ => choice(
      $.lower_identifier,
      $.type_identifier,
      $.upper_identifier,
      $._single_upper,
      $.lower_unwrap,
      $.type_unwrap,
      $.upper_unwrap,
      $.single_upper_unwrap,
      'str',
    ),

    lower_identifier: _ => /[a-z_][A-Za-z0-9_]*/,

    // Type names are PascalCase (and may contain digits, `E1`); constants
    // are UPPER_SNAKE. Keeping them apart matters for
    // `if n >= OBUF_CAP { ... }`: the constant must not be mistaken for a
    // struct initializer head.
    type_identifier: _ => /[A-Z][A-Za-z0-9_]+/,

    upper_identifier: _ => token(prec(1, /[A-Z][A-Z0-9]*(_[A-Z0-9]+)+/)),

    _single_upper: _ => /[A-Z]/,
  },
});
