document.getElementById('access-btn').addEventListener('click', () => {
    document.getElementById('blast-door-left').classList.add('open-left');
    document.getElementById('blast-door-right').classList.add('open-right');
    
    // Delayed, slow scroll
    //setTimeout(() => {
    //    window.scrollTo({
    //        top: document.getElementById('rsvp-section').offsetTop - 50,
    //        behavior: 'smooth'
    //    });
    //}, 2000); // Wait for doors to fully clear
});

document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    let isValid = true;

    // 1. Validate Text/Email/Tel/Number
    form.querySelectorAll('input[required]:not([type="radio"])').forEach(el => {
        if (!el.value.trim()) {
            el.classList.add('error-highlight');
            isValid = false;
        } else {
            el.classList.remove('error-highlight');
        }
    });

    // 2. Validate Radio Buttons (Attending)
    const radioGroup = form.querySelector('.radio-group');
    const attendingChecked = form.querySelector('input[name="attending"]:checked');
    if (!attendingChecked) {
        radioGroup.classList.add('error-highlight'); // Highlight the container
        isValid = false;
    } else {
        radioGroup.classList.remove('error-highlight');
    }

    if (!isValid) {
        alert("Incomplete Intel! Please fill all required fields.");
        return;
    }
    const allergiesArray = Array.from(document.querySelectorAll('input[name="allergies"]:checked')).map(checkbox => checkbox.value)
	
    // 3. Prepare Data
    const formData = {
        guestName: document.getElementById('guestName').value,
        parentName: document.getElementById('parentName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        attending: form.querySelector('input[name="attending"]:checked').value,
        guests: document.getElementById('guests').value,
        allergies: allergiesArray.join(', ') || 'None', 
        comments: document.getElementById('comments').value
    };

    try {
        const response = await fetch('/api/rsvp82', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        console.log("received response: ", response);
        if (response.ok) {
            const result = await response.json();
            console.log("Server response:", result);
            console.log("Form data we are trying to show:", formData);
        
            // CRITICAL: Ensure these IDs exist in the DOM when this runs
            const nameSpan = document.getElementById('sum-name');
            const statusSpan = document.getElementById('sum-status');
            const guestsSpan = document.getElementById('sum-guests');

            if (nameSpan) nameSpan.innerText = formData.guestName || "Unknown Agent";
            if (statusSpan) statusSpan.innerText = formData.attending || "N/A";
            if (guestsSpan) guestsSpan.innerText = formData.guests || "1";

            // Toggle Visibility
            document.getElementById('rsvp-section').style.display = 'none';
            document.getElementById('venue-hero').style.display = 'none';
            document.getElementById('blast-door-left').style.display = 'none';
            document.getElementById('blast-door-right').style.display = 'none';
            
            document.getElementById('confirmation-page').style.display = 'block';
            window.scrollTo(0, 0);
        
            console.log("gmail user: ", process.env.GMAIL_USER);
            console.log("admin email: ", process.env.ADMIN_EMAIL);
            const email = response.email;
        }
    } catch (err) {
        console.error("event Handler function error:", err);
    }
});
