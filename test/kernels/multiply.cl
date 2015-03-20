kernel void multiply(global float* values, constant float value)
{
    values[get_global_id(0)] *= value;
}