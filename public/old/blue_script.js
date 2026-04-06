// 1. Entrance Animation
document.getElementById('access-btn').addEventListener('click', () => {
    document.getElementById('blast-door-left').classList.add('open-left');
    document.getElementById('blast-door-right').classList.add('open-right');
    
    // Auto-scroll to RSVP after 1.5 seconds (after doors open)
    setTimeout(() => {
        document.getElementById('rsvp-section').scrollIntoView({ behavior: 'smooth' });
    }, 1500);
});

// 2. Form Submission
document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    let isValid = true;

    // Basic Validation highlight
    form.querySelectorAll('[required]').forEach(input => {
        if (!input.value) {
            input.classList.add('error-highlight');
            isValid = false;
        } else {
            input.classList.remove('error-highlight');
        }
    });

    if (!isValid) return;

    const formData = {
        guestName: document.getElementById('guestName').value,
        attending: form.querySelector('input[name="attending"]:checked').value
    };

    try {
        const response = await fetch('/api/rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            // Transition to Confirmation Page
            document.getElementById('venue-hero').style.display = 'none';
            document.getElementById('rsvp-section').style.display = 'none';
            
            document.getElementById('summary-name').innerText = formData.guestName;
            document.getElementById('summary-status').innerText = formData.attending;
            
            document.getElementById('confirmation-page').style.display = 'block';
            window.scrollTo(0, 0);
        }
    } catch (err) {
        console.error("Transmission failed", err);
    }
});
