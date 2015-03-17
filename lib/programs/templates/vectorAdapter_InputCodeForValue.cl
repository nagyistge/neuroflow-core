if (get_global_id(0) == 0 && get_global_id(1) == 0)
{
    <% var vector = args.getArg(options.vectorArgName) %>
    <% var input = args.getArg(options.inputArgName) %>
    <% var offset = args.getArg(options.offset) %>
    {{input}}[{{offset}}] =
}