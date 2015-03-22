kernel void {{kernelName}}({{args.signatures}})
{
    {{forEachGlobalBegin('size')}}
    values[idx] += addition;
    {{forEachGlobalEnd('size')}}
}