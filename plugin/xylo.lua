if vim.g.loaded_xylo_nvim then
  return
end
vim.g.loaded_xylo_nvim = true

vim.filetype.add({ extension = { x = "xylo" } })

vim.api.nvim_create_user_command("XyloInstall", function()
  require("xylo").install()
end, { desc = "Build and load the Xylo tree-sitter parser" })

vim.api.nvim_create_user_command("XyloInfo", function()
  require("xylo").info()
end, { desc = "Show Xylo parser and query status" })

if not vim.g.xylo_setup_done then
  require("xylo").setup()
end
