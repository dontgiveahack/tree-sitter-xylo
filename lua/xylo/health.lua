local M = {}

function M.check()
  local health = vim.health
  health.start("xylo")

  local xylo = require("xylo")

  health.start("Parser")
  local path = xylo.parser_path()
  if vim.uv.fs_stat(path) then
    health.ok("parser found: " .. path)
  else
    health.error("parser missing: " .. path, { "Run `:XyloInstall` or `make` in the tree-sitter-xylo directory." })
  end
  if xylo.has_parser() then
    health.ok("language 'xylo' is loaded")
  else
    health.warn("language 'xylo' is not loaded yet")
  end

  health.start("Queries")
  local root = vim.fn.fnamemodify(debug.getinfo(1, "S").source:gsub("^@", ""), ":h:h:h")
  for _, query in ipairs({ "highlights", "locals", "folds", "indents", "tags", "textobjects" }) do
    local file = root .. "/queries/" .. query .. ".scm"
    if vim.uv.fs_stat(file) then
      health.ok(query .. " query present")
    else
      health.warn(query .. " query missing")
    end
  end

  health.start("Build tools")
  if vim.fn.executable(os.getenv("CC") or "cc") == 1 then
    health.ok("C compiler available")
  else
    health.error("no C compiler found (set $CC or install cc)")
  end
end

return M
