/**
 * Unicorn Studio Admin JavaScript
 */
(function($) {
    'use strict';

    // Test Connection
    $('#unicorn-test-connection').on('click', function() {
        var $btn = $(this);
        var $result = $('#unicorn-connection-result');
        var originalText = $btn.text();

        $btn.prop('disabled', true).text(unicornStudio.strings.testing);
        $result.removeClass('success error hidden').text('');

        $.ajax({
            url: unicornStudio.ajaxUrl,
            method: 'POST',
            data: {
                action: 'unicorn_studio_test_connection',
                nonce: unicornStudio.nonce,
                api_url: $('#unicorn_studio_api_url').val(),
                api_key: $('#unicorn_studio_api_key').val(),
                site_id: $('#unicorn_studio_site_id').val()
            },
            success: function(response) {
                if (response.success) {
                    $result.addClass('success').text(unicornStudio.strings.testSuccess);
                } else {
                    $result.addClass('error').text(response.data.message || unicornStudio.strings.testError);
                }
                $result.removeClass('hidden');
            },
            error: function() {
                $result.addClass('error').text(unicornStudio.strings.testError).removeClass('hidden');
            },
            complete: function() {
                $btn.prop('disabled', false).text(originalText);
            }
        });
    });

    // Sync Buttons
    $('.unicorn-sync-btn').on('click', function() {
        var $btn = $(this);
        var syncType = $btn.data('type');
        var $progress = $('#unicorn-sync-progress');
        var $progressFill = $progress.find('.unicorn-progress-fill');
        var $progressText = $progress.find('.unicorn-progress-text');
        var $result = $('#unicorn-sync-result');

        // Disable all sync buttons
        $('.unicorn-sync-btn').prop('disabled', true);

        // Show progress
        $progress.removeClass('hidden');
        $progressFill.css('width', '10%');
        $progressText.text(unicornStudio.strings.syncing);
        $result.addClass('hidden').removeClass('success error');

        // Animate progress
        var progress = 10;
        var progressInterval = setInterval(function() {
            if (progress < 90) {
                progress += Math.random() * 10;
                $progressFill.css('width', progress + '%');
            }
        }, 500);

        $.ajax({
            url: unicornStudio.ajaxUrl,
            method: 'POST',
            data: {
                action: 'unicorn_studio_sync',
                nonce: unicornStudio.nonce,
                sync_type: syncType
            },
            success: function(response) {
                clearInterval(progressInterval);
                $progressFill.css('width', '100%');

                if (response.success) {
                    $progressText.text(unicornStudio.strings.syncComplete);
                    $result.addClass('success').html(formatSyncResult(response.data)).removeClass('hidden');

                    // Reload page after successful sync
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                } else {
                    $progressText.text(unicornStudio.strings.syncError);
                    $result.addClass('error').text(response.data.message || unicornStudio.strings.syncError).removeClass('hidden');
                }
            },
            error: function() {
                clearInterval(progressInterval);
                $progressFill.css('width', '100%');
                $progressText.text(unicornStudio.strings.syncError);
                $result.addClass('error').text(unicornStudio.strings.syncError).removeClass('hidden');
            },
            complete: function() {
                // Re-enable buttons after a delay
                setTimeout(function() {
                    $('.unicorn-sync-btn').prop('disabled', false);
                    $progress.addClass('hidden');
                }, 3000);
            }
        });
    });

    // Format sync result for display
    function formatSyncResult(data) {
        var html = '<strong>' + unicornStudio.strings.syncComplete + '</strong><br>';

        if (data.content_types) {
            html += '✓ Content Types: ' + (data.content_types.count || 0) + '<br>';
        }
        if (data.taxonomies) {
            html += '✓ Taxonomies: ' + (data.taxonomies.taxonomies || 0) + ', Terms: ' + (data.taxonomies.terms || 0) + '<br>';
        }
        if (data.entries) {
            html += '✓ Entries: ' + (data.entries.total_synced || 0) + ' (Neu: ' + (data.entries.total_created || 0) + ', Aktualisiert: ' + (data.entries.total_updated || 0) + ')<br>';
        }
        if (data.css) {
            html += '✓ CSS: ' + (data.css.size || '-') + '<br>';
        }

        return html;
    }

    // Copy to clipboard
    $('.unicorn-copy-btn').on('click', function() {
        var $btn = $(this);
        var targetId = $btn.data('target');
        var $target = $('#' + targetId);
        var text = $target.text();

        // Create temporary input
        var $temp = $('<input>');
        $('body').append($temp);
        $temp.val(text).select();

        try {
            document.execCommand('copy');
            var originalText = $btn.text();
            $btn.text('Kopiert!');
            setTimeout(function() {
                $btn.text(originalText);
            }, 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }

        $temp.remove();
    });

})(jQuery);
