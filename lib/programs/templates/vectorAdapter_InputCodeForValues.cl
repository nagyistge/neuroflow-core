if (get_global_id(0) == 0)
{
    <% args.forEachArgsByCategories(options.inputValueCategory, function(inputValue) { %>
        <% var inputs = args.getArg(options.inputArgNames[inputValue.index.index1]) %>
        <% var offset = args.getArg(options.inputValueOffsetArgNamePrefix, inputValue.index) %>
        <% var multiply = args.tryGetArg(options.inputValueMultiplyArgNamePrefix, inputValue.index) %>
        <% var add = args.tryGetArg(options.inputValueAddArgNamePrefix, inputValue.index) %>
        <% if (multiply && add) { %>
            {{inputs}}[{{offset}}] = ({{ convertToReal(inputValue) }} * {{ multiply }}) + {{ add }};
        <% } else { %>
            {{inputs}}[{{offset}}] = {{ convertToReal(inputValue) }};
        <% } %>
    <% } %>
}