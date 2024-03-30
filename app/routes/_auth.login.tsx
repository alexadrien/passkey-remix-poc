// '/login' Login Page, the '_auth' is ignored in the path
import {ActionFunctionArgs, LoaderFunctionArgs, redirect} from "@remix-run/node";
import {authenticator, webAuthnStrategy} from "~/services/authenticator.server";
import {Form, useActionData, useLoaderData} from "@remix-run/react";
import {handleFormSubmit} from "remix-auth-webauthn/browser";
import {sessionStorage} from "~/services/session.server";

// Loader function is trigger on each GET of the page
export async function loader({request}: LoaderFunctionArgs) {
    const user = await authenticator.isAuthenticated(request);
    if (user) return redirect("/");

    // Generate Options is a specific function implemented by
    // remix-auth-webauthn. It triggers the 'getUserByUsername'
    // functions in webAuthnStrategy parameters (check where webAuthnStrategy is created).
    // It returns a WebAuthnOptionsResponse. Basically, this contains the user when he's
    // logged in and a Passkey challenge when he's not. the passkey challenge
    return await webAuthnStrategy.generateOptions(request, sessionStorage, user)
}

// Action function is trigger on each POST submission of a Form on the
// page (except if the 'name' of the Form is specified to trigger another page action
export async function action({request}: ActionFunctionArgs) {
    try {
        await authenticator.authenticate("webauthn", request, {
            successRedirect: "/",
        });
        return {error: null};
    } catch (error) {
        // This allows us to return errors to the page without triggering the error boundary.
        // ErrorBoundary is a component on Remix which is displayed only when an action failed.
        // It's a default UI fallback when requests are failing.
        if (error instanceof Response && error.status >= 400) {
            return {error: (await error.json()) as { message: string }};
        }
        throw error;
    }
}

export default function Login() {
    // Options will be loaded on each page load
    const options = useLoaderData<typeof loader>();
    // actionData is only loaded when you submitted the form.
    // Here, since we redirect the user on '/' when he's authenticated, the
    // only use for this actionData is to hold the error object if anything happens
    const actionData = useActionData<typeof action>();
    return (
        <div style={{fontFamily: "system-ui, sans-serif", lineHeight: "1.8"}}>
            <Form onSubmit={handleFormSubmit(options)} method="POST">
                <div>
                    Choose a username (this can be an email on a real website)
                </div>

                <div>
                    <input type="text" name="username" placeholder="username"/>
                </div>

                {/*The click on this button will trigger the loader function
                since there is the formMethod='GET' and no 'name' specified.
                This will just reload the same page*/}
                <button formMethod="GET">
                    Check if the entered username is available on the server
                </button>

                {/*This will submit the form with a POST request.
                But first, the magic of the passkey will be generated in
                the function 'handleFormSubmit' (see above).*/}
                <button
                    name="intent"
                    value="registration"
                    disabled={options.usernameAvailable !== true}
                >
                    If available, click here to trigger registration (generate passkey and everything)
                </button>

                {/*Same as above, thanks to the 'handleFormSubmit' function, this does the magic for us.*/}
                <button name="intent" value="authentication">
                    Click here to authenticate (check passkey and stuff)
                </button>

                {actionData?.error ? <div>{actionData.error.message}</div> : null}
            </Form>
        </div>
    );
}
