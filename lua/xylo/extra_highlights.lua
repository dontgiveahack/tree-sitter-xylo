-- Extra, range-precise highlighting inside comments.
--
-- Tree-sitter represents a comment as one token, so a query cannot color
-- only the `TODO` word or the `@in` marker. This module scans comment nodes
-- and places extmarks on the exact substrings.

local M = {}

local ns = vim.api.nvim_create_namespace("xylo.extra_highlights")
local attached = {}
local comment_query

-- Standard Neovim tree-sitter captures; colorschemes style these.
local TODO_GROUPS = {
  TODO = "@comment.todo",
  WIP = "@comment.todo",
  FIXME = "@comment.error",
  ERROR = "@comment.error",
  HACK = "@comment.warning",
  WARNING = "@comment.warning",
  NOTE = "@comment.note",
  INFO = "@comment.note",
  XXX = "@comment.note",
}

local function is_word_boundary(text, first, last)
  local before = first > 1 and text:sub(first - 1, first - 1) or ""
  local after = last < #text and text:sub(last + 1, last + 1) or ""
  return not before:match("[%w_]") and not after:match("[%w_]")
end

local function mark(buf, row, start_col, end_col, group)
  vim.api.nvim_buf_set_extmark(buf, ns, row, start_col, {
    end_row = row,
    end_col = end_col,
    hl_group = group,
    priority = 200,
  })
end

local function scan(buf, node)
  local start_row, start_col, end_row = node:range()
  if start_row ~= end_row then
    return
  end

  local text = vim.treesitter.get_node_text(node, buf)

  for word, group in pairs(TODO_GROUPS) do
    local init = 1
    while true do
      local first, last = text:find(word, init, true)
      if not first then
        break
      end
      if is_word_boundary(text, first, last) then
        mark(buf, start_row, start_col + first - 1, start_col + last, group)
      end
      init = last + 1
    end
  end

  -- Contracts live in doc comments (`/// ...`), not in ordinary comments.
  if text:sub(1, 3) == "///" and text:sub(1, 4) ~= "////" then
    for _, word in ipairs({ "@in", "@out" }) do
      local init = 1
      while true do
        local first, last = text:find(word, init, true)
        if not first then
          break
        end
        if is_word_boundary(text, first, last) then
          mark(buf, start_row, start_col + first - 1, start_col + last, "@keyword.directive")
        end
        init = last + 1
      end
    end
  end
end

function M.refresh(buf)
  buf = buf or vim.api.nvim_get_current_buf()
  if not vim.api.nvim_buf_is_valid(buf) then
    return
  end

  vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)

  local ok, parser = pcall(vim.treesitter.get_parser, buf, "xylo")
  if not ok or not parser then
    return
  end

  local ok_tree, tree = pcall(function()
    return parser:parse()[1]
  end)
  if not ok_tree or not tree then
    return
  end

  comment_query = comment_query or vim.treesitter.query.parse("xylo", "(comment) @comment")
  for _, node in comment_query:iter_captures(tree:root(), buf) do
    scan(buf, node)
  end
end

function M.attach(buf)
  buf = buf or vim.api.nvim_get_current_buf()
  if attached[buf] then
    M.refresh(buf)
    return
  end
  attached[buf] = true

  local group = vim.api.nvim_create_augroup("XyloComments" .. buf, { clear = true })
  vim.api.nvim_create_autocmd({ "TextChanged", "TextChangedI" }, {
    group = group,
    buffer = buf,
    callback = function()
      vim.schedule(function()
        M.refresh(buf)
      end)
    end,
  })
  vim.api.nvim_create_autocmd("BufWipeout", {
    group = group,
    buffer = buf,
    callback = function()
      attached[buf] = nil
    end,
  })

  M.refresh(buf)
end

function M.setup()
  -- `@keyword.directive` is the natural capture for `@in` / `@out`; some
  -- colorschemes do not define it, so give it a sensible fallback.
  vim.api.nvim_set_hl(0, "@keyword.directive", { link = "Keyword", default = true })
end

return M
