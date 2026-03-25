# Seal Bot Engine
Hex Tic Tac Toe engine developed by imaseal and available at https://github.com/Ramora0/HexTicTacToe.  
The engine is based of a minimax search with alpha-beta pruning.

## Compile Engine
The following command can be used to compile the engine.  
```ps1
docker run --rm `
  -v ${pwd}/cpp:/src `
  emscripten/emsdk `
  emcc engine_wasm.cpp `
    -o sealEngine.js `
    -sEXPORT_ES6=1 `
    -sALLOW_MEMORY_GROWTH `
    -sDISABLE_EXCEPTION_CATCHING=0 `
    -O3 -lembind
```