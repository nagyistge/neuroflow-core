<% eachGlobalIndex(function() { %>
    <% args.forEachArgsByCategory('gradient', function(gradients) { %>
        <% var weights = args.getArgByIndex('weights', gradients.index); %>
        <% var deltas = args.getArgByIndex('deltas', gradients.index); %>

        float update = ({{gradients}}[idx] * {{options.gradientDescent.rate}})<%= options.gradientDescent.isOnline ? '' : ' / iterationCount' %>;
        float lastUpdate = {{deltas}}[idx];
        <% if (options.gradientDescent.smoothing) { %>
        float smoothV = 1.0f - {{options.gradientDescent.momentum}};
        update = (lastUpdate * {{options.gradientDescent.momentum}}) + (update * smoothV);
        <% } else { %>
        update = (lastUpdate * {{options.gradientDescent.momentum}}) + update;
        <% } %>
        {{weights}}[idx] += update;
        {{deltas}}[idx] = update;
    <% }); %>
<% }); %>