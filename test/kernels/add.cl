kernel void {{kernelName}}({{args.signatures}})
{
    values[get_global_id(0)] += addition;
}