local M = {}

local api = vim.api

local function plugin_root()
  local source = debug.getinfo(1, "S").source
  if source:sub(1, 1) == "@" then
    source = source:sub(2)
  end
  -- <root>/lua/xylo/init.lua -> <root>
  return vim.fn.fnamemodify(source, ":h:h:h")
end

local function is_windows()
  return vim.fn.has("win32") == 1 or vim.fn.has("win64") == 1
end

local function parser_name()
  return is_windows() and "xylo.dll" or "xylo.so"
end

function M.parser_path()
  if vim.g.xylo_parser_path and vim.g.xylo_parser_path ~= "" then
    return vim.g.xylo_parser_path
  end
  local local_parser = plugin_root() .. "/parser/" .. parser_name()
  if vim.uv.fs_stat(local_parser) then
    return local_parser
  end
  return vim.fn.stdpath("data") .. "/site/parser/" .. parser_name()
end

-- `vim.treesitter.language.add` reports a missing/invalid parser by returning
-- `nil, err` (without raising), so a bare `pcall` is not enough.
local function add_language(path)
  local opts = path and { path = path } or nil
  local ok, res = pcall(vim.treesitter.language.add, "xylo", opts)
  return ok and res == true, res
end

local function have_parser()
  return (add_language(nil))
end

function M.build(opts)
  opts = opts or {}
  local root = plugin_root()
  local src = root .. "/src/parser.c"
  if not vim.uv.fs_stat(src) then
    vim.notify("[xylo] missing " .. src .. " (run `tree-sitter generate`)", vim.log.levels.ERROR)
    return false
  end

  local out = root .. "/parser/" .. parser_name()
  vim.fn.mkdir(root .. "/parser", "p")

  local cc = opts.cc or os.getenv("CC") or "cc"
  local shared
  if is_windows() then
    shared = "-shared"
  elseif vim.fn.has("mac") == 1 then
    shared = "-dynamiclib"
  else
    shared = "-shared"
  end

  local cmd = {
    cc,
    "-O2",
    "-fPIC",
    shared,
    "-I",
    root .. "/src",
    "-o",
    out,
    src,
  }

  vim.notify("[xylo] building parser with: " .. table.concat(cmd, " "), vim.log.levels.INFO)
  local result = vim.system(cmd, { cwd = root, text = true }):wait()
  if result.code ~= 0 then
    vim.notify("[xylo] parser build failed:\n" .. (result.stderr or ""), vim.log.levels.ERROR)
    return false
  end

  vim.notify("[xylo] parser built at " .. out, vim.log.levels.INFO)
  return out
end

function M.install(opts)
  opts = opts or {}
  local path = M.build(opts)
  if not path then
    return false
  end
  local ok, err = add_language(path)
  if not ok then
    vim.notify("[xylo] could not load parser: " .. tostring(err), vim.log.levels.ERROR)
    return false
  end
  vim.notify("[xylo] parser loaded. Open a `.x` file to start highlighting.", vim.log.levels.INFO)
  return true
end

local function load_parser(opts)
  if have_parser() then
    return true
  end

  local path = M.parser_path()
  if vim.uv.fs_stat(path) then
    if add_language(path) then
      return true
    end
  end

  if opts.auto_install then
    return M.install(opts)
  end

  return false
end

local function start(buf)
  local ok, err = pcall(vim.treesitter.start, buf, "xylo")
  if not ok then
    if not vim.g.xylo_start_warned then
      vim.g.xylo_start_warned = true
      vim.notify("[xylo] could not start highlighting: " .. tostring(err), vim.log.levels.WARN)
    end
    return false
  end

  -- nvim-treesitter owns the query-driven indentexpr; wire it when present.
  local has_indent = pcall(require, "nvim-treesitter.indent")
  if has_indent then
    vim.bo[buf].indentexpr = "v:lua.require'nvim-treesitter.indent'.get_indent(v:lnum)"
  end

  local has_extra, extra = pcall(require, "xylo.extra_highlights")
  if has_extra then
    extra.attach(buf)
  end
  return true
end

function M.setup(opts)
  opts = opts or {}
  opts.auto_install = opts.auto_install ~= false
  opts.auto_start = opts.auto_start ~= false

  -- Queries live next to this plugin; make sure Neovim can see them even
  -- when the directory was added to rtp without a plugin manager.
  local root = plugin_root()
  if not vim.tbl_contains(vim.opt.rtp:get(), root) then
    vim.opt.rtp:append(root)
  end

  vim.filetype.add({ extension = { x = "xylo" } })

  local has_extra, extra = pcall(require, "xylo.extra_highlights")
  if has_extra then
    extra.setup()
  end

  local loaded = load_parser(opts)
  if not loaded and not opts.quiet then
    vim.notify(
      "[xylo] tree-sitter parser not found. Run `:XyloInstall` (or `make` in the plugin directory).",
      vim.log.levels.WARN
    )
  end

  if opts.auto_start then
    local group = api.nvim_create_augroup("XyloTreeSitter", { clear = true })
    api.nvim_create_autocmd("FileType", {
      group = group,
      pattern = "xylo",
      callback = function(ev)
        if not loaded then
          loaded = load_parser(opts)
        end
        if loaded then
          start(ev.buf)
        end
      end,
    })

    local buf = api.nvim_get_current_buf()
    if vim.bo[buf].filetype == "xylo" and loaded then
      start(buf)
    end
  end

  M._opts = opts
  vim.g.xylo_setup_done = true
  return M
end

function M.has_parser()
  return have_parser()
end

function M.info()
  local path = M.parser_path()
  local exists = vim.uv.fs_stat(path) ~= nil
  local loaded = have_parser()
  local lines = {
    "xylo.nvim",
    "  parser path: " .. path .. (exists and " (found)" or " (missing)"),
    "  parser loaded: " .. tostring(loaded),
    "  nvim: " .. tostring(vim.version()),
    "  tree-sitter queries: " .. plugin_root() .. "/queries/xylo",
  }
  for _, line in ipairs(lines) do
    print(line)
  end
end

return M
