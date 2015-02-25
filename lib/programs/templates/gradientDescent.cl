<% args.forEachArgsByCategories(options.gradientCategories, function(gradients) { %>

{{ forEachGlobalBegin(args.getArg(options.gradientsSizeArgNamePrefix, gradients.index)) }}
    <% var weights = args.getArg(options.weightsArgNamePrefix, gradients.index); %>
    <% var deltas = args.getArg(options.deltasArgNamePrefix, gradients.index); %>
    {
        real update = ({{gradients}}[idx] * {{args.getArg('gdRate', options.gdRateArgIndex)}}){{ options.isOnline ? '' : ' / iterationCount' }};
        real lastUpdate = {{deltas}}[idx];
        <% if (options.smoothing) { %>
        real smoothV = 1.0f - {{args.getArg('gdMomentum', options.gdMomentumArgIndex)}};
        update = (lastUpdate * {{args.getArg('gdMomentum', options.gdMomentumArgIndex)}}) + (update * smoothV);
        <% } else { %>
        update = (lastUpdate * {{args.getArg('gdMomentum', options.gdMomentumArgIndex)}}) + update;
        <% } %>
        {{weights}}[idx] += update;
        {{deltas}}[idx] = update;
    }
{{ forEachGlobalEnd() }}

<% }); %>