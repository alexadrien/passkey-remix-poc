// this is where the magic is done around the Passkey
import {WebAuthnStrategy} from "remix-auth-webauthn/server";
import {
    createAuthenticator,
    createUser,
    getAuthenticatorById,
    getAuthenticators,
    getUserById,
    getUserByUsername,
    type User,
} from "./db.server";
import {Authenticator} from "remix-auth";
import {sessionStorage} from "./session.server";

export let authenticator = new Authenticator<User>(sessionStorage);

export const webAuthnStrategy = new WebAuthnStrategy<User>(
    {
        // The human-readable name of your app
        rpName: "Remix Auth WebAuthn",
        // The hostname of the website, determines where passkeys can be used
        // See https://www.w3.org/TR/webauthn-2/#relying-party-identifier
        rpID: (request) => new URL(request.url).hostname,
        // Website URL (or array of URLs) where the registration can occur
        origin: (request) => new URL(request.url).origin,
        // Return the list of authenticators associated with this user. You might
        // need to transform a CSV string into a list of strings at this step.
        // Authenticators are what you store in your database.
        // See the interface defined by the lib. It's pretty straight-forward
        // They do a weird shit on transport where they split the string,
        // this is because of how it's stored in this POC
        getUserAuthenticators: async (user) => {
            const authenticators = await getAuthenticators(user);

            return authenticators.map((authenticator) => ({
                ...authenticator,
                transports: authenticator.transports.split(","),
            }));
        },
        // Transform the user object into the shape expected by the strategy.
        // Adapter function
        getUserDetails: (user) =>
            user ? {id: user.id, username: user.username} : null,
        // Find a user in the database with their username
        getUserByUsername: (username) => getUserByUsername(username),
        // This is required by the lib to have a function able
        // to search for a passkey in db when a user is logged in.
        getAuthenticatorById: (id) => getAuthenticatorById(id),
    },

    // the verify function is where the hard work is done.
    async function verify(
        {
            authenticator,
            type,
            username
        }) {
        let user: User | null = null;
        const savedAuthenticator = getAuthenticatorById(authenticator.credentialID);
        // This type can be found in the 'intent' variables on the login form buttons
        if (type === "registration") {
            // Check if the authenticator exists in the database
            if (savedAuthenticator) throw new Error("Authenticator has already been registered.")
            else {
                // Username is null for authentication verification,
                // but required for registration verification.
                // It is unlikely this error will ever be thrown,
                // but it helps with the TypeScript checking
                if (!username) throw new Error("Username is required.");
                user = getUserByUsername(username);

                // Don't allow someone to register a passkey for
                // someone else's account.
                if (user) throw new Error("User already exists.");

                // Create a new user and authenticator
                user = createUser(username);
                createAuthenticator(authenticator, user.id);
            }
        } else if (type === "authentication") {
            if (!savedAuthenticator) throw new Error("Authenticator not found");
            user = getUserById(savedAuthenticator.userId);
        }

        if (!user) throw new Error("User not found");
        return user;
    }
);

authenticator.use(webAuthnStrategy);
