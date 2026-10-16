package domain

// OAuthIdentity is populated only from a provider response verified on the server.
// It is never accepted from an HTTP JSON body.
type OAuthIdentity struct {
	Provider, Subject, Email, Name, AvatarURL string
	EmailVerified                             bool
}
