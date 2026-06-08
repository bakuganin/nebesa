document.addEventListener('DOMContentLoaded', function() {
    // Create the overlay container
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    overlay.style.zIndex = '2147483647'; // Max z-index to ensure it's on top of everything
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backdropFilter = 'blur(5px)'; // Add a modern blur effect

    // Create the modal container
    var modal = document.createElement('div');
    modal.style.backgroundColor = '#ffffff';
    modal.style.padding = '40px 30px';
    modal.style.borderRadius = '12px';
    modal.style.textAlign = 'center';
    modal.style.boxShadow = '0 15px 40px rgba(0,0,0,0.6)';
    modal.style.maxWidth = '450px';
    modal.style.width = '90%';
    modal.style.fontFamily = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    // Create the icon
    var icon = document.createElement('div');
    icon.innerHTML = '&#9888;'; // Warning sign
    icon.style.fontSize = '48px';
    icon.style.color = '#e74c3c';
    icon.style.marginBottom = '15px';
    icon.style.lineHeight = '1';

    // Create the title
    var title = document.createElement('h2');
    title.innerText = 'Сайт временно недоступен';
    title.style.color = '#2c3e50';
    title.style.margin = '0 0 15px 0';
    title.style.fontSize = '24px';
    title.style.fontWeight = '600';

    // Create the message text
    var message = document.createElement('p');
    message.innerText = 'Работа сайта приостановлена из-за неоплаты. Пожалуйста, оплатите услуги для восстановления полного доступа к ресурсу.';
    message.style.color = '#555';
    message.style.lineHeight = '1.6';
    message.style.margin = '0';
    message.style.fontSize = '16px';

    // Assemble the modal
    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(message);
    overlay.appendChild(modal);

    // Append to body and prevent scrolling
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // Prevent pointer events on the rest of the body
    Array.from(document.body.children).forEach(function(child) {
        if (child !== overlay) {
            child.style.pointerEvents = 'none';
            child.style.userSelect = 'none';
        }
    });
});
