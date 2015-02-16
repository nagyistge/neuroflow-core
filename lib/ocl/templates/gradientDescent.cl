<% args.forEachArgsByCategories(options.optionsPropertyName.gradientCategories, function(gradients) { %>
{{ forEachGlobalBegin(args.getArg(options.optionsPropertyName.gradientsSizeArgNamePrefix, gradients.index)) }}
    <% var weights = args.getArg(options.optionsPropertyName.weightsArgNamePrefix, gradients.index); %>
    <% var deltas = args.getArg(options.optionsPropertyName.deltasArgNamePrefix, gradients.index); %>
    {
        float update = ({{gradients}}[idx] * {{args.getArg('gdRate', options.optionsPropertyName.gdRateArgIndex)}}){{ options.optionsPropertyName.isOnline ? '' : ' / iterationCount' }};
        float lastUpdate = {{deltas}}[idx];
        <% if (options.optionsPropertyName.smoothing) { %>
        float smoothV = 1.0f - {{args.getArg('gdMomentum', options.optionsPropertyName.gdMomentumArgIndex)}};
        update = (lastUpdate * {{args.getArg('gdMomentum', options.optionsPropertyName.gdMomentumArgIndex)}}) + (update * smoothV);
        <% } else { %>
        update = (lastUpdate * {{args.getArg('gdMomentum', options.optionsPropertyName.gdMomentumArgIndex)}}) + update;
        <% } %>
        {{weights}}[idx] += update;
        {{deltas}}[idx] = update;
    }
{{ forEachGlobalEnd() }}
<% }); %>