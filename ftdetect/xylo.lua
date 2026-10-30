-- Filetype detection for Xylo sources. `plugin/xylo.lua` also registers it,
-- but keeping it here makes the plugin work when only ftdetect is loaded.
vim.filetype.add({ extension = { x = "xylo" } })
