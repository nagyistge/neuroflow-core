{
uint globalSize = get_global_size(0);
uint globalId = get_global_id(0);
uint block_wgGlobalEnumerate = {{sizeArgName}} / globalSize + ({{sizeArgName}} % globalSize != 0 ? 1 : 0);
uint {{idxVarName}} = globalId * block_wgGlobalEnumerate;
uint max_wgGlobalEnumerate = {{idxVarName}} + block_wgGlobalEnumerate;
if (max_wgGlobalEnumerate > {{sizeArgName}}) max_wgGlobalEnumerate = {{sizeArgName}};
while ({{idxVarName}} < max_wgGlobalEnumerate) {