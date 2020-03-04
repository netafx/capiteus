/* eslint-disable */
document.addEventListener('DOMContentLoaded', function() {
	const toRepaint = document.querySelectorAll('.v2-js-repaint');

	for (let a = 0; a < toRepaint.length; a++) {
		toRepaint[a].style.display = 'none';
		toRepaint[a].offsetHeight;
		toRepaint[a].style.display = '';
	}
});
