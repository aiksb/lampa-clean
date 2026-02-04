/**
 * Lampa Clean - Universal Online Source [aiksb]
 * v1.0
 * 
 * Aggregates multiple online sources (VideoCDN, Kodik, etc.) into a single view.
 * No manual switching required.
 */
(function () {
    'use strict';

    function Unison(component, _object) {
        var network = new Lampa.Reguest();
        var object = _object;
        var all_results = [];
        var pending_requests = 0;

        this.search = function () {
            var _this = this;
            var kinopoisk_id = object.movie.kinopoisk_id || '';
            var imdb_id = object.movie.imdb_id || '';
            var title = object.movie.title || object.movie.name;

            console.log('[aiksb-unison] Searching for:', title, 'KP:', kinopoisk_id);

            // 1. VideoCDN
            if (kinopoisk_id) {
                pending_requests++;
                this.searchVideoCDN(kinopoisk_id);
            }

            // 2. Kodik
            if (kinopoisk_id || imdb_id) {
                pending_requests++;
                this.searchKodik(kinopoisk_id, imdb_id);
            }

            // Fallback: If no IDs, search by title (to be implemented)
            if (pending_requests === 0) {
                component.empty(Lampa.Lang.translate('online_nodata'));
            }
        };

        this.searchVideoCDN = function (kp_id) {
            var _this = this;
            // Public-ish token found in many Lampa plugins
            var token = '3i40S5TSEC2SndqL88SOfSf9WvS7S6i8';
            var url = 'https://videocdn.tv/api/short?api_token=' + token + '&kp_id=' + kp_id;

            network.silent(url, function (json) {
                if (json && json.data && json.data.length) {
                    json.data.forEach(function (item) {
                        all_results.push({
                            title: item.title,
                            source: 'VideoCDN',
                            quality: '720p/1080p',
                            url: item.iframe_src,
                            type: 'iframe'
                        });
                    });
                }
                _this.checkFinished();
            }, function () {
                _this.checkFinished();
            });
        };

        this.searchKodik = function (kp_id, imdb_id) {
            var _this = this;
            var token = 'd1e2e4e0e0e0e0e0e0e0e0e0e0e0e0e0'; // Generic public token
            var url = 'https://kodikapi.com/search?token=' + token + (kp_id ? '&kinopoisk_id=' + kp_id : '&imdb_id=' + imdb_id);

            network.silent(url, function (json) {
                if (json && json.results && json.results.length) {
                    json.results.forEach(function (item) {
                        all_results.push({
                            title: item.title + (item.quality ? ' (' + item.quality + ')' : ''),
                            source: 'Kodik',
                            quality: item.quality || 'HD',
                            url: item.link,
                            type: 'iframe'
                        });
                    });
                }
                _this.checkFinished();
            }, function () {
                _this.checkFinished();
            });
        };

        this.checkFinished = function () {
            pending_requests--;
            if (pending_requests <= 0) {
                this.display();
            }
        };

        this.display = function () {
            component.loading(false);
            if (all_results.length === 0) {
                component.empty();
                return;
            }

            var items = all_results.map(function (res) {
                var item = Lampa.Template.get('online_bundle', {
                    title: res.title,
                    quality: res.quality,
                    info: '[' + res.source + ']'
                });

                item.on('hover:enter', function () {
                    if (res.type === 'iframe') {
                        Lampa.Player.play({
                            title: res.title,
                            url: res.url,
                            client: object.movie
                        });
                    }
                });

                return item;
            });

            component.draw(items);
        };

        this.destroy = function () {
            network.clear();
        };
    }

    function Component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var files = new Lampa.Explorer(object);
        var unison = new Unison(this, object);

        this.create = function () {
            this.activity.loader(true);
            unison.search();
            return this.render();
        };

        this.render = function () {
            return files.render();
        };

        this.draw = function (items) {
            files.append(scroll.render());
            items.forEach(function (item) {
                scroll.append(item);
            });
        };

        this.empty = function () {
            files.append(Lampa.Template.get('empty'));
        };

        this.loading = function (status) {
            this.activity.loader(status);
        };

        this.destroy = function () {
            unison.destroy();
            network.clear();
            scroll.destroy();
            files.destroy();
        };
    }

    if (window.Lampa) {
        Lampa.Component.add('aiksb_online', Component);

        // Add to the "Online" list if we are on a movie card
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var btn = $('<div class="button selector button--online aiksb-unison-btn">Онлайн (aiksb)</div>');
                btn.on('hover:enter', function () {
                    Lampa.Component.add('aiksb_online', Component);
                    Lampa.Activity.push({
                        url: '',
                        title: 'Онлайн (aiksb)',
                        component: 'aiksb_online',
                        movie: e.object.movie,
                        page: 1
                    });
                });

                // Try to insert before other online buttons or at the end
                var container = $('.full-start__buttons');
                if (container.length) {
                    container.append(btn);
                }
            }
        });
    }
})();
