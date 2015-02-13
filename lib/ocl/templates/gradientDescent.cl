{{ forEachGlobalBegin() }}
    <% args.forEachArgsByCategory('gradient', function(gradients) { %>
        <% var weights = args.getArgByIndex('weights', gradients.index); %>
        <% var deltas = args.getArgByIndex('deltas', gradients.index); %>
        {
            float update = ({{gradients}}[idx] * gdRate){{ options.gradientDescent.isOnline ? '' : ' / iterationCount' }};
            float lastUpdate = {{deltas}}[idx];
            <% if (options.gradientDescent.smoothing) { %>
            float smoothV = 1.0f - gdMomentum;
            update = (lastUpdate * gdMomentum) + (update * smoothV);
            <% } else { %>
            update = (lastUpdate * gdMomentum) + update;
            <% } %>
            {{weights}}[idx] += update;
            {{deltas}}[idx] = update;
        }
    <% }); %>
{{ forEachGlobalEnd() }}