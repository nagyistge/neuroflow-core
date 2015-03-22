kernel void {{kernelName}}({{args.signatures}})
{
    {{forEachGlobalBegin('size')}}
    values[idx] *= multiplier;
    {{forEachGlobalEnd('size')}}
}