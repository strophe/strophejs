/** Function: assertRegexMatch
 *  An assertion using regex.
 *
 *  Parameters:
 *    (String) text - String to search.
 *    (RegExp) pattern - Regular expression.
 *    (String) message - Error message.
 */
function assertRegexMatch(text, pattern, message)
{
	var newMessage = message;
	var isMatch = pattern.test(text);
	if( !isMatch ){
		newMessage = 'Text "' + text + '" does not match pattern "' + pattern + '".';
		if( typeof message === 'string'  &&  message.length > 0 )
			newMessage += (' ' + message);
	}
	ok( isMatch, newMessage );
}
