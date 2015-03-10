"use strict";
var ncore = require("../../../index");
var task = ncore.utils.task;
var _ = require("lodash");
var TrainerError = require("./trainerError");
var CachemanMemory = require("cacheman-memory");
var Cacheman = require("cacheman");
var Bluebird = require("bluebird");
var lwip = require("lwip");
var ref = require("ref");
var uint32 = ref.types.uint32;

function toRGBA(sourceColor) {
    return (sourceColor.r << 24) | (sourceColor.g << 16) | (sourceColor.b << 8) || sourceColor.a;
}

function Sampler(files, options) {
    this.files = files;
    this.options = options;
}

Object.defineProperties(Sampler, {
    cache: {
        get: function () {
            return global.samplerCache ||
                (global.samplerCache =
                    Bluebird.promisifyAll(new Cacheman("samplerCache", {ttl: 60, engine: new CachemanMemory()})));
        }
    }
});

Sampler.prototype.generateFFSample = task.async(function*() {
    const quality = _.random(1, 100);
    let image = yield this._getRandomImage();
    let data = yield this._createSampleData(image, quality);
    const x = _.random(0, data.width - 1);
    const y = _.random(0, data.height - 1);
    return this._makeFFSample(data, x, y);
});

Sampler.prototype._makeFFSample = function (data, x, y) {
    let w2 = Math.floor(this.options.width / 2);
    let h2 = Math.floor(this.options.height / 2);
    let iBuff = new Buffer(this.options.width * this.options.height * 4);
    let oBuff = new Buffer(4);
    for (let sourceY = y - h2, destY = 0; destY < this.options.height; sourceY++, destY++) {
        for (let sourceX = x - w2, destX = 0; destX < this.options.width; sourceX++, destX++) {
            let iCoord = (destY * this.options.width * 4) + destX * 4;
            let sourceColor = data.resultImage.getPixel(Math.abs(sourceX), Math.abs(sourceY));
            let destColor = toRGBA(sourceColor);
            uint32.set(iBuff, iCoord, destColor);
        }
    }
    uint32.set(oBuff, 0, toRGBA(data.resultImage.getPixel(x, y)));
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
            resultImage: yield(lwip.openAsync(yield image.toBufferAsync("jpeg", {quality: quality}), "jpeg"))
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
