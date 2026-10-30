# tree-sitter-xylo

Tree-sitter grammar, queries and a small Neovim plugin for the
[Xylo](https://github.com/dontgiveahack/xylo-base) programming language
(`.x` files).

The grammar is generated from `grammar.js`; the Neovim side is plain Lua and
does not require `nvim-treesitter`. The parser is built locally from the
committed `src/parser.c` with the C compiler already on your machine.

- Repository: <https://github.com/dontgiveahack/tree-sitter-xylo>
- Issues: <https://github.com/dontgiveahack/tree-sitter-xylo/issues>

## Features

- Syntax highlighting for modules, imports, attributes (`@pub`, `@operator`,
  `@embed`, …), comptime (`#pre`, `#code`, `#insert`, …), types (`T?`, `T!`,
  pointers, slices, arrays, maps, generics) and templates.
- Scope-aware locals (`locals.scm`), folding, indent queries and
  `nvim-treesitter-textobjects` captures.
- `TODO`, `FIXME`, `HACK`, `NOTE`/`INFO`/`XXX` inside comments and the
  `@in` / `@out` contracts in `///` docs are highlighted on the exact token
  (not the whole comment).
- The `$` of mutable bindings is highlighted separately from the name.
- `@pub`, `@static`, `@operator`, doc comments (`///`, `//!`) and contracts
  (`@in` / `@out`) are kept as distinct nodes.
- Filetype detection, comment strings and a `:checkhealth xylo` report.
  Indentation options (`expandtab`, `shiftwidth`, `tabstop`, `softtabstop`)
  are left untouched: they belong to your Neovim configuration.

## Requirements

- Neovim 0.10+ (tested with 0.12).
- A C compiler (`cc`) to build `src/parser.c`.
- `tree-sitter` CLI only when you modify `grammar.js`.

## Installation

The plugin calls `require("xylo").setup()` itself when it loads, so installing
it is enough: no `setup()` call is required unless you want to change the
options below.

### `vim.pack` (Neovim 0.12+)

Add it to `~/.config/nvim/lua/pack.lua`:

```lua
vim.pack.add({
	"https://github.com/dontgiveahack/tree-sitter-xylo",
})
```

No release is needed: without `version`, `vim.pack` tracks the repository's
default branch (`main`). `:packupdate` / `vim.pack.update()` pulls new commits.
To pin a branch, tag or commit:

```lua
vim.pack.add({
	{ src = "https://github.com/dontgiveahack/tree-sitter-xylo", version = "main" },
	-- { src = "...", version = "v0.1.0" },
	-- { src = "...", version = "<commit>" },
})
```

### lazy.nvim

```lua
{
	"dontgiveahack/tree-sitter-xylo",
	-- plugin/xylo.lua runs setup(); add `config` only to pass options:
	-- config = function() require("xylo").setup({ auto_start = false }) end,
}
```

### Built-in packages (`:packadd`)

No plugin manager is needed. Clone the repository as a native package:

```sh
mkdir -p ~/.local/share/nvim/site/pack/xylo/start
git clone https://github.com/dontgiveahack/tree-sitter-xylo \
	~/.local/share/nvim/site/pack/xylo/start/tree-sitter-xylo
```

`plugin/xylo.lua` runs `setup()` at startup, so there is nothing to add to
`init.lua`. The first run builds `parser/xylo.so` in the package directory.

For `pack/*/opt` instead of `pack/*/start`, clone under `opt/` and run
`:packadd tree-sitter-xylo` (or call `vim.cmd.packadd("tree-sitter-xylo")` from
`init.lua`). Loading the package runs `setup()` immediately.

### Local checkout (development)

To work on the grammar and see changes immediately (the package is a symlink,
not a copy):

```sh
git clone https://github.com/dontgiveahack/tree-sitter-xylo \
	~/projects/tree-sitter-xylo
mkdir -p ~/.local/share/nvim/site/pack/xylo/opt
ln -sfn ~/projects/tree-sitter-xylo \
	~/.local/share/nvim/site/pack/xylo/opt/tree-sitter-xylo
```

Then in `pack.lua`:

```lua
vim.cmd.packadd("tree-sitter-xylo") -- loads plugin/, ftdetect/ and runs setup()
```

Edits apply immediately. Alternatively, without packages:

```lua
vim.opt.rtp:append(vim.fn.expand("~/projects/tree-sitter-xylo"))
require("xylo").setup()
```

### Manual runtime path

```sh
git clone https://github.com/dontgiveahack/tree-sitter-xylo
cd tree-sitter-xylo
make                     # builds parser/xylo.so
```

Then add the directory to Neovim's runtime path:

```lua
vim.opt.rtp:append(vim.fn.expand("~/projects/tree-sitter-xylo"))
```

The `ftdetect/`, `queries/`, `plugin/` and `ftplugin/` directories are picked
up from there. If you prefer a system-wide install:

```sh
make install             # ~/.local/share/nvim/site/{parser,queries/xylo}
```

The plugin finds that parser through `stdpath("data")`, so it does not need to
write inside the checkout.

### With nvim-treesitter

You do not need nvim-treesitter for highlighting. If you use it and want
query-driven indentation, keep this plugin on the runtime path (the queries
are read from `queries/xylo/`). For old nvim-treesitter versions that still
use the `parsers` table:

```lua
local parsers = require("nvim-treesitter.parsers")
parsers.xylo = {
  install_info = {
    url = "https://github.com/dontgiveahack/tree-sitter-xylo",
    files = { "src/parser.c" },
    branch = "main",
  },
  filetype = "xylo",
}
```

Newer `nvim-treesitter` (main branch) no longer needs the table; use
`:XyloInstall` or `make install` instead.

## Commands

```vim
:XyloInstall   " build and load parser/xylo.so
:XyloInfo      " parser path, load state and Neovim version
:checkhealth xylo
```

`:XyloInfo` is useful when a `.x` buffer is not highlighting: it shows whether
the parser exists, whether the `xylo` language is loaded and where the queries
live.

## Configuration

```lua
require("xylo").setup({
  auto_install = true, -- build the parser when it is missing
  auto_start = true,   -- start highlighting for every xylo buffer
  quiet = false,       -- silence the "parser missing" warning
  cc = nil,            -- compiler override (defaults to $CC or "cc")
})
```

`setup()` is called automatically when the plugin loads, so an explicit call
is only needed to change these options. Calling it early is safe: the plugin
skips its default `setup()` when `vim.g.xylo_setup_done` is already set.

```lua
-- pack.lua
vim.pack.add({ "https://github.com/dontgiveahack/tree-sitter-xylo" })
require("xylo").setup({ auto_start = false })
```

## Troubleshooting

If a `.x` buffer has no highlighting:

1. `:XyloInfo` — shows whether the parser exists and whether the `xylo`
   language is loaded.
2. `:XyloInstall` — rebuilds `parser/xylo.so` and loads it.
3. `:checkhealth xylo` — checks parser, queries and the C compiler.
4. `:set filetype?` — must be `xylo`. If it is something else, the plugin is
   not on the runtime path or `ftdetect` was not loaded.

On a fresh install the plugin builds the parser on first load. If the package
directory is not writable, run `make install` or `:XyloInstall` once from a
writable checkout.

## Development

```sh
git clone https://github.com/dontgiveahack/tree-sitter-xylo
cd tree-sitter-xylo
tree-sitter generate     # regenerate src/parser.c and node-types.json
make                     # rebuild parser/xylo.so
tree-sitter test         # corpus tests
tree-sitter parse ../src/rt/str.x
```

`src/parser.c` is generated but committed, so users only need a C compiler.
Regenerate it and commit the result whenever `grammar.js` changes.

The grammar is intentionally permissive: it is an editor grammar, not the
reference parser. It parses the runtime, the standard library, the tests and
the self-hosted compiler; a few deliberately-invalid negative tests (a raw
newline inside a string, a nested `or` block, a tuple literal, bare `..`)
still produce `ERROR` nodes, which is expected.

Known edge case: a braceless `if` whose condition ends in a binary `-` and
whose body starts on the next line (`if v := a..<b; v.end - v.start == 1`)
is ambiguous without newline tokens. Wrapping the condition in parentheses is
a safe workaround.

Project layout:

```
grammar.js              grammar source
src/                    generated parser (parser.c, grammar.json, node-types.json)
queries/xylo/           highlights, locals, folds, indents, tags, textobjects
lua/xylo/               plugin setup, parser build/load, :checkhealth
plugin/xylo.lua         commands + automatic setup
ftdetect/ ftplugin/     filetype and buffer-local defaults
Makefile                generate/build/install helpers
test/corpus/            tree-sitter grammar tests
```

## Versioning

`main` is the development branch and the default for `vim.pack.add`. Releases
are optional: tag a commit (`v0.1.0`) only if you want to use
`version = vim.version.range("*")` or keep a stable pinned version. A release
does not need binary artifacts; it only carries the source (including
`src/parser.c`).

## License

MIT. See `LICENSE`.
