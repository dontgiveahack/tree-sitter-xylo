CC ?= cc
CFLAGS ?= -O2 -fPIC

UNAME := $(shell uname -s 2>/dev/null || echo unknown)
ifeq ($(UNAME),Darwin)
SHARED := -dynamiclib
else
SHARED := -shared
endif

ifeq ($(OS),Windows_NT)
PARSER := parser/xylo.dll
else
PARSER := parser/xylo.so
endif

NVIM_SITE ?= $(HOME)/.local/share/nvim/site

.PHONY: all generate parser test install uninstall clean

all: $(PARSER)

parser: $(PARSER)

$(PARSER): src/parser.c src/grammar.json src/node-types.json
	@mkdir -p parser
	$(CC) $(CFLAGS) $(SHARED) -I src -o $@ src/parser.c

generate:
	tree-sitter generate

test:
	tree-sitter test

install: $(PARSER)
	@mkdir -p $(NVIM_SITE)/parser $(NVIM_SITE)/queries/xylo
	cp $(PARSER) $(NVIM_SITE)/parser/
	cp queries/xylo/*.scm $(NVIM_SITE)/queries/xylo/
	@printf 'Installed parser and queries into %s\n' '$(NVIM_SITE)'

uninstall:
	rm -f $(NVIM_SITE)/parser/$(notdir $(PARSER))
	rm -rf $(NVIM_SITE)/queries/xylo

clean:
	rm -rf parser
