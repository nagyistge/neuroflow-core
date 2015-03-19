{{ forEachGlobalBegin(options.inputBuffersMaxSize) }}

    <% args.forEachArgsByCategories(options.inputBufferCategory, function(inputBuffer) { %>
        <% var inputs = args.getArg(options.inputArgNames[inputBuffer.index.index1]) %>
        <% var offset = args.getArg(options.inputBufferOffsetArgNamePrefix, inputBuffer.index) %>
        <% var size = args.getArg(options.inputBufferSizeArgNamePrefix, inputBuffer.index) %>
        <% var transformBuffer = args.tryGetArg(options.inputBufferTransformBufferArgNamePrefix, inputBuffer.index) %>
        if (idx < {{ size }})
        {
            <% if (transformBuffer) { %>
                uint o2 = {{offset}} * 2;
                {{inputs}}[idx + {{ offset }}] = ({{ convertToReal(inputBuffer + '[' + offset + ']') }} * {{multiply}}[o2]) + {{add}}[o2 + 1];
            <% } else { %>
                {{inputs}}[idx + {{ offset }}] = {{ convertToReal(inputBuffer + '[' + offset + ']') }};
            <% } %>
        }
    <% } %>

{{ forEachGlobalEnd() }}