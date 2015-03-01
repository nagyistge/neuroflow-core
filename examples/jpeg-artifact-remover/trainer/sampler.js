"use strict";
var ncore = require("../../../index");
var task = ncore.utils.task;
var _ = require("lodash");
var TrainerError = require("./trainerError");
var CachemanMemory = require("cacheman-memory");
var Cacheman = require("cacheman");
var Bluebird = require("bluebird");
var lwip = require("lwip");

function Sampler(files, options) {
    this.files = files;
    this.options = options;
}

Object.defineProperties(Sampler, {
    cache: {
        get: function () {
            return global.samplerCache ||
                (global.samplerCache =
                    Bluebird.promisifyAll(new Cacheman("samplerCache", { ttl: 60, engine: new CachemanMemory() })));
        }
    }
});

Sampler.prototype.generateFFSample = task.async(function*() {
    const quality = _.random(1, 100);
    let image = yield this._getRandomImage();
    let data = yield this._createSampleData(image, quality);
    const x = _.random(0, data.width - 1);
    const y = _.random(0, data.height - 1);
    const key = `${image.path}_${quality}_${x}_${y}`;
    let sample = yield Sampler.cache.getAsync(key);
    if (!sample) {
        return this._makeFFSample(data, x, y);
    }
    return sample;
});

Sampler.prototype._makeFFSample = function(data, x, y) {

};

Sampler.prototype._createSampleData = task.async(function *(image, quality) {
    const key = `${image.path}_${quality}`;
    let data = yield Sampler.cache.getAsync(key);
    if (!data) {
        data = {
            path: image.path,
            width: image.width(),
            height: image.height(),
            originalImage: image,
            resultImage: yield(lwip.openAsync(yield image.toBufferAsync("jpeg", { quality: quality }), "jpeg"))
        };
    }
    return data;
});

Sampler.prototype._getRandomImage = task.async(function *() {
    let index = _.random(0, this.files.length - 1);
    for (; ;) {
        try {
            return yield this._getImageAt(index);
        }
        catch (e) {
            console.warn(`Cannot load file: ${this.files[index].name}!\nError:\n${e.stack}`);
            _.pullAt(this.files, index);
            if (this.file.length === 0) {
                throw new TrainerError("There is no readable sample file found, terminating.");
            }
        }
    }
});

Sampler.prototype._getImageAt = task.async(function *(index) {
    let file = this.files[index];
    let image = yield Sampler.cache.getAsync(file.path);
    if (!image) {
        image = yield this._loadImage(file);
        yield Sampler.cache.set(file.path, image);
    }
    return image;
});

Sampler.prototype._loadImage = task.async(function *(file) {
    var image = Bluebird.promisifyAll(yield(lwip.openAsync(file.path, "png")));
    image.path = file.path;
    return image;
});

module.exports = Sampler;
