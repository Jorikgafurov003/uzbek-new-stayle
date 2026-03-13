
import fetch from 'node-fetch';

async function testLoginLoop() {
    const url = "https://uzbek-new-stayle.onrender.com/api/auth/login";
    const body = {
        phone: "998936584455",
        password: "1210999"
    };

    console.log("Starting login test loop...");
    for (let i = 1; i <= 20; i++) {
        try {
            console.log(`Attempt ${i}...`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const text = await res.text();
            console.log(`Status: ${res.status}`);
            console.log(`Response: ${text.substring(0, 100)}`);
            if (res.status === 200) {
                console.log("SUCCESS: Logged in!");
                break;
            }
        } catch (err) {
            console.log(`Error: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
}

testLoginLoop();
