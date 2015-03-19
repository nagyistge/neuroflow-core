{{ forEachGlobalBegin(options.outputBuffersMaxSize) }}

    <% args.forEachArgsByCategories(options.outputBufferCategory, function(outputBuffer) { %>
        <% var outputs = args.getArg(options.outputArgNames[outputBuffer.index.index1]) %>
        <% var type = args.getArg(options.outputBufferTypes[outputBuffer.index.index1]) %>
        <% var offset = args.getArg(options.outputBufferOffsetArgNamePrefix, outputBuffer.index) %>
        <% var size = args.getArg(options.outputBufferSizeArgNamePrefix, outputBuffer.index) %>
        <% var transformBuffer = args.tryGetArg(options.outputBufferTransformBufferArgNamePrefix, outputBuffer.index) %>
        if (idx < {{ size }})
        {
            <% if (transformBuffer) { %>
                uint o2 = {{offset}} * 2;
                {{outputBuffer}}[{{offset}}] = {{ convert(outputs + '[idx + ' + offset + ']', type) }} * {{multiply}}[o2]) + {{add}}[o2 + 1];
            <% } else { %>
                {{outputBuffer}}[{{offset}}] = {{ convert(outputs + '[idx + ' + offset + ']', type) }};
            <% } %>
        }
    <% } %>

{{ forEachGlobalEnd() }}