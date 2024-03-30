import type {ActionFunction, LoaderFunctionArgs, MetaFunction} from "@remix-run/node";
import {authenticator} from "~/services/authenticator.server";
import {Form, useLoaderData} from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async ({request}: LoaderFunctionArgs) => {
  const user = await authenticator.isAuthenticated(request);
  return {user}
};

export const action: ActionFunction = async ({request}) => {
  await authenticator.logout(request, {redirectTo: "/"});
};

export default function Index() {
  const {user} = useLoaderData<typeof loader>()
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>{user ? "You are authenticated": "You are not authenticated"}</h1>
      <h2>{user ? `User: ${user.username}` : ``}</h2>
      <Form method="get" action="/login">
        <button>click here to go to the login page</button>
      </Form>
      <Form method="post">
        <button type="submit">click here to logout</button>
      </Form>
    </div>
  );
}
